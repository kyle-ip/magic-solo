/**
 * Resolve local public paths vs remote CDN with remote-first / local-first strategies.
 * Uses cardImageMap when present; otherwise derives Scryfall URLs from UUID + kind.
 */

import {
  getClassicCardBackId,
  lookupByCardId,
  lookupByLocalPath,
  type CardImageKind,
} from '../data/cardImageMap'
import { assetUrl } from './assetUrl'

export type AssetStrategy = 'remote-first' | 'local-first'

export type { CardImageKind }

const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

const resolveCache = new Map<string, string>()
const resolveInflight = new Map<string, Promise<string>>()

export type ScryfallFaceSize =
  | 'small'
  | 'normal'
  | 'large'
  | 'png'
  | 'art_crop'
  | 'border_crop'

export function scryfallCardFaceUrl(
  cardId: string,
  size: Exclude<ScryfallFaceSize, 'border_crop'>,
  face: 'front' | 'back' = 'front',
): string {
  const id = cardId.toLowerCase()
  const ext = size === 'png' ? 'png' : 'jpg'
  return `https://cards.scryfall.io/${size}/${face}/${id[0]}/${id[1]}/${id}.${ext}`
}

/** Swap Scryfall CDN face size in an existing cards.scryfall.io URL. */
export function scryfallResizeFaceUrl(
  url: string,
  size: ScryfallFaceSize,
): string {
  const resized = url.replace(
    /\/(small|normal|large|png|art_crop|border_crop)\//,
    `/${size}/`,
  )
  if (size === 'png') {
    return resized.replace(/\.jpe?g(\?|$)/i, '.png$1')
  }
  // Switching away from a png path: restore jpg extension.
  if (/\/png\//.test(url)) {
    return resized.replace(/\.png(\?|$)/i, '.jpg$1')
  }
  return resized
}

/** Full-card print face — Scryfall `png` (~745×1040). */
export function pngUrlFromFaceUrl(frontImageUrl: string): string {
  if (/cards\.scryfall\.io\//i.test(frontImageUrl)) {
    return scryfallResizeFaceUrl(frontImageUrl, 'png')
  }
  if (/backs\.scryfall\.io\//i.test(frontImageUrl)) {
    return scryfallResizeFaceUrl(frontImageUrl, 'png')
  }
  const id = extractCardUuid(frontImageUrl)
  if (id) return scryfallCardFaceUrl(id, 'png')
  return frontImageUrl
}

/**
 * Print-assistant on-screen preview — Scryfall `normal` JPEG (~488×680).
 * Non-Scryfall URLs (local assets, blobs) are returned unchanged.
 */
export function previewUrlFromPrintUrl(printImageUrl: string): string {
  if (
    /cards\.scryfall\.io\//i.test(printImageUrl) ||
    /backs\.scryfall\.io\//i.test(printImageUrl)
  ) {
    return scryfallResizeFaceUrl(printImageUrl, 'normal')
  }
  return printImageUrl
}

export function scryfallCardBackUrl(backId: string): string {
  const id = backId.toLowerCase()
  return `https://backs.scryfall.io/png/${id[0]}/${id[1]}/${id}.png`
}

export function extractCardUuid(
  pathOrId: string | null | undefined,
): string | null {
  if (!pathOrId) return null
  const m = pathOrId.match(UUID_RE)
  return m ? m[1]!.toLowerCase() : null
}

/** Infer map kind from a local asset path when not passed explicitly. */
export function inferKindFromLocalPath(
  localPath: string | null | undefined,
): CardImageKind | undefined {
  if (!localPath) return undefined
  const p = localPath.toLowerCase()
  if (p.includes('mana-symbols/')) return 'mana_symbol'
  if (p.includes('/covers/')) return 'cover'
  if (p.endsWith('mtg-card-back.jpg') || p.endsWith('/back.png')) {
    return 'card_back'
  }
  if (p.includes('-art.') || p.endsWith('-art.jpg')) return 'art_crop'
  if (p.includes('-display.') || p.includes('display')) return 'large'
  if (
    p.includes('-normal.') ||
    p.includes('-front.') ||
    p.endsWith('-front.png')
  ) {
    return 'normal'
  }
  return undefined
}

function deriveRemote(
  localPath: string | null | undefined,
  opts?: { id?: string; kind?: CardImageKind },
): string | null {
  const mapped = lookupByLocalPath(localPath)
  const kind =
    opts?.kind ??
    inferKindFromLocalPath(localPath) ??
    mapped?.kind ??
    'normal'
  const id =
    opts?.id?.toLowerCase() ??
    extractCardUuid(localPath) ??
    mapped?.id?.toLowerCase() ??
    extractCardUuid(opts?.id)

  if (kind === 'mana_symbol' && localPath) {
    const file = localPath.split('/').pop()?.replace(/\.svg$/i, '')
    if (file) {
      return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(file.toUpperCase())}.svg`
    }
  }

  if (kind === 'card_back') {
    const backId = id || getClassicCardBackId()
    const fromMap = lookupByCardId(backId, 'card_back')
    if (fromMap) return fromMap.remote
    return scryfallCardBackUrl(backId)
  }

  if (kind === 'cover') {
    return lookupByLocalPath(localPath)?.remote ?? null
  }

  // Prefer the requested kind even when the local path is a different face
  // (e.g. board tokens ask for art_crop while assets are *-normal.jpg).
  if (mapped) {
    if (mapped.kind === kind) return mapped.remote
    if (id) {
      const byKind = lookupByCardId(id, kind)
      if (byKind) return byKind.remote
      if (
        kind === 'small' ||
        kind === 'normal' ||
        kind === 'large' ||
        kind === 'art_crop'
      ) {
        return scryfallCardFaceUrl(id, kind)
      }
    }
    return mapped.remote
  }

  if (!id) return null
  if (
    kind === 'small' ||
    kind === 'normal' ||
    kind === 'large' ||
    kind === 'art_crop'
  ) {
    const fromMap = lookupByCardId(id, kind)
    if (fromMap) return fromMap.remote
    return scryfallCardFaceUrl(id, kind)
  }

  return null
}

export interface AssetCandidates {
  primary: string
  fallback: string
  remote: string | null
  local: string
}

export function assetCandidates(
  localPath: string | null | undefined,
  opts?: {
    id?: string
    kind?: CardImageKind
    strategy?: AssetStrategy
  },
): AssetCandidates {
  const strategy = opts?.strategy ?? 'remote-first'
  const local = assetUrl(localPath)
  const remote = deriveRemote(localPath, opts)

  if (!remote || !local) {
    const only = remote || local || ''
    return { primary: only, fallback: only, remote, local }
  }

  if (strategy === 'local-first') {
    return { primary: local, fallback: remote, remote, local }
  }
  return { primary: remote, fallback: local, remote, local }
}

/** Prefer remote URL for display; local remains fallback via onError / resolve. */
export function preferredAssetUrl(
  localPath: string | null | undefined,
  opts?: {
    id?: string
    kind?: CardImageKind
    strategy?: AssetStrategy
  },
): string {
  return assetCandidates(localPath, opts).primary
}

/** Gallery / list thumbs — Scryfall `small` (146×204). */
export function thumbUrlFromFaceUrl(frontImageUrl: string): string {
  return scryfallResizeFaceUrl(frontImageUrl, 'small')
}

/** Detail-modal face — Scryfall `large` (672×936). */
export function largeUrlFromFaceUrl(frontImageUrl: string): string {
  return scryfallResizeFaceUrl(frontImageUrl, 'large')
}

export function withLargeFace<T extends { frontImageUrl: string }>(card: T): T {
  return {
    ...card,
    frontImageUrl: largeUrlFromFaceUrl(card.frontImageUrl),
  }
}

/** Remote image probe timeout — fall back to local rather than hang. */
export const REMOTE_IMAGE_TIMEOUT_MS = 2000

function probeImage(url: string, timeoutMs = REMOTE_IMAGE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(true)
      return
    }
    if (!url) {
      resolve(false)
      return
    }
    const img = new Image()
    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ok)
    }
    const timer = setTimeout(() => done(false), timeoutMs)
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = url
  })
}

/**
 * Async resolve with session cache — for CSS background-image and preload.
 * Tries primary then fallback according to strategy.
 */
export async function resolveAssetUrl(
  localPath: string | null | undefined,
  opts?: {
    id?: string
    kind?: CardImageKind
    strategy?: AssetStrategy
  },
): Promise<string> {
  const { primary, fallback } = assetCandidates(localPath, opts)
  const cacheKey = `${opts?.strategy ?? 'remote-first'}|${primary}|${fallback}`
  const hit = resolveCache.get(cacheKey)
  if (hit) return hit

  const pending = resolveInflight.get(cacheKey)
  if (pending) return pending

  const task = (async () => {
    const strategy = opts?.strategy ?? 'remote-first'
    // Prefer timing out the remote leg quickly under remote-first.
    const primaryTimeout =
      strategy === 'remote-first' && primary !== fallback
        ? REMOTE_IMAGE_TIMEOUT_MS
        : REMOTE_IMAGE_TIMEOUT_MS * 2
    if (await probeImage(primary, primaryTimeout)) {
      resolveCache.set(cacheKey, primary)
      return primary
    }
    if (fallback && fallback !== primary && (await probeImage(fallback))) {
      resolveCache.set(cacheKey, fallback)
      return fallback
    }
    resolveCache.set(cacheKey, primary || fallback)
    return primary || fallback
  })().finally(() => {
    resolveInflight.delete(cacheKey)
  })

  resolveInflight.set(cacheKey, task)
  return task
}

/** Preload primary then fallback (does not throw). */
export async function preloadAssetCandidates(
  localPath: string | null | undefined,
  opts?: {
    id?: string
    kind?: CardImageKind
    strategy?: AssetStrategy
  },
): Promise<string> {
  return resolveAssetUrl(localPath, opts)
}

/** @internal Vitest */
export function resetRemoteAssetCacheForTests(): void {
  resolveCache.clear()
  resolveInflight.clear()
}
