import { getDeck } from '../data/deckStore'
import { HERO_DEFS } from '../game/heroes'
import { getPlayerDeck, type PlayerDeckId } from '../game/playerDecks'
import { defsFromDeck, type ChallengeCode } from '../game/types'
import { preloadImage } from './imageCache'
import {
  assetCandidates,
  preferredAssetUrl,
  resolveAssetUrl,
  type CardImageKind,
} from './remoteAsset'

export type ImagePreloadProgress = {
  done: number
  total: number
}

/** @deprecated Prefer ImagePreloadProgress — kept for existing call sites. */
export type ChallengePreloadProgress = ImagePreloadProgress

type PreloadJob = {
  path: string
  kind: CardImageKind
}

const CONCURRENCY = 8
/** Faces used in challenge / assistant play (board, hand, preview, hero, BG). */
const KINDS_PLAY: CardImageKind[] = ['art_crop', 'normal', 'png']
const KINDS_DECK_WARM: CardImageKind[] = ['art_crop', 'normal', 'png']
const CLASSIC_CARD_BACK = 'assets/cards/mtg-card-back.jpg'

function pushJob(
  jobs: PreloadJob[],
  seen: Set<string>,
  path: string | null | undefined,
  kind: CardImageKind,
) {
  if (!path) return
  const key = `${kind}::${path}`
  if (seen.has(key)) return
  seen.add(key)
  jobs.push({ path, kind })
}

function pushChallengeDeckJobs(
  jobs: PreloadJob[],
  seen: Set<string>,
  code: ChallengeCode,
  kinds: CardImageKind[],
) {
  const challenge = getDeck(code)
  if (!challenge) return
  pushJob(jobs, seen, challenge.heroArt, 'art_crop')
  for (const def of defsFromDeck(challenge.cards)) {
    for (const kind of kinds) {
      pushJob(jobs, seen, def.image, kind)
    }
    if (def.artCrop) pushJob(jobs, seen, def.artCrop, 'art_crop')
  }
  for (const card of challenge.cards) {
    pushJob(jobs, seen, card.images.back, 'card_back')
  }
  pushJob(jobs, seen, CLASSIC_CARD_BACK, 'card_back')
}

/** Collect unique image jobs for challenge play (challenge + player + heroes). */
export function collectChallengeImageJobs(opts: {
  code: ChallengeCode
  playerDeckId: PlayerDeckId
  heroIds: string[]
}): PreloadJob[] {
  const jobs: PreloadJob[] = []
  const seen = new Set<string>()

  pushChallengeDeckJobs(jobs, seen, opts.code, KINDS_PLAY)

  const player = getPlayerDeck(opts.playerDeckId)
  pushJob(jobs, seen, player.art, 'art_crop')
  for (const card of player.cards) {
    for (const kind of KINDS_PLAY) {
      pushJob(jobs, seen, card.image, kind)
    }
  }

  for (const id of opts.heroIds) {
    const hero = HERO_DEFS.find((h) => h.id === id)
    if (!hero) continue
    pushJob(jobs, seen, hero.image, 'normal')
    pushJob(jobs, seen, hero.image, 'png')
    pushJob(jobs, seen, hero.art || hero.image, 'art_crop')
  }

  return jobs
}

/** Challenge deck faces for assistant board / library search. */
export function collectAssistantImageJobs(code: ChallengeCode): PreloadJob[] {
  const jobs: PreloadJob[] = []
  const seen = new Set<string>()
  pushChallengeDeckJobs(jobs, seen, code, KINDS_PLAY)
  return jobs
}

/** Lighter warm for deck intro page + CTA hover (no gate). */
export function collectDeckPageWarmJobs(code: ChallengeCode): PreloadJob[] {
  const jobs: PreloadJob[] = []
  const seen = new Set<string>()
  pushChallengeDeckJobs(jobs, seen, code, KINDS_DECK_WARM)
  return jobs
}

/**
 * Warm every URL CardImage / RemoteArt may hit for this path:
 * resolve cache + sync primary + fallback (avoids post-enter cold loads).
 */
async function runPathJob(job: PreloadJob): Promise<void> {
  try {
    const { primary, fallback } = assetCandidates(job.path, { kind: job.kind })
    const resolved = await resolveAssetUrl(job.path, { kind: job.kind })
    const urls = [resolved, primary, fallback].filter(Boolean)
    const unique = [...new Set(urls)]
    await Promise.all(
      unique.map((url) => preloadImage(url).catch(() => undefined)),
    )
  } catch {
    /* best-effort */
  }
}

async function runJobs(
  jobs: PreloadJob[],
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> {
  const total = jobs.length
  let done = 0
  onProgress?.({ done, total })
  if (total === 0) return { done: 0, total: 0 }

  let cursor = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (cursor < jobs.length) {
      const i = cursor
      cursor += 1
      const job = jobs[i]
      if (!job) break
      await runPathJob(job)
      done += 1
      onProgress?.({ done, total })
    }
  })

  await Promise.all(workers)
  return { done, total }
}

/**
 * Warm browser image cache for challenge play faces before entering the board.
 * Never rejects.
 */
export async function preloadChallengeImages(
  opts: {
    code: ChallengeCode
    playerDeckId: PlayerDeckId
    heroIds: string[]
  },
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> {
  return runJobs(collectChallengeImageJobs(opts), onProgress)
}

/**
 * Warm challenge-deck faces before launching the game assistant.
 * Never rejects.
 */
export async function preloadAssistantImages(
  code: ChallengeCode,
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> {
  return runJobs(collectAssistantImageJobs(code), onProgress)
}

/** Background warm for `/decks/:code` — does not gate UI. */
export async function warmDeckPageImages(code: ChallengeCode): Promise<void> {
  await runJobs(collectDeckPageWarmJobs(code))
}

/**
 * Preload already-resolved absolute image URLs (e.g. Scryfall thumbs).
 * Never rejects.
 */
export async function preloadUrlList(
  urls: string[],
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> {
  const unique = [...new Set(urls.filter(Boolean))]
  const total = unique.length
  let done = 0
  onProgress?.({ done, total })
  if (total === 0) return { done: 0, total: 0 }

  let cursor = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (cursor < unique.length) {
      const i = cursor
      cursor += 1
      const url = unique[i]
      if (!url) break
      try {
        await preloadImage(url)
      } catch {
        /* best-effort */
      }
      done += 1
      onProgress?.({ done, total })
    }
  })

  await Promise.all(workers)
  return { done, total }
}

/** Classic card-back URL used by library stacks when a deck omits a back. */
export function classicCardBackUrl(): string {
  return preferredAssetUrl(CLASSIC_CARD_BACK, { kind: 'card_back' })
}
