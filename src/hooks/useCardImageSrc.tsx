import {
  useEffect,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import {
  assetCandidates,
  resolveAssetUrl,
  type AssetStrategy,
  type CardImageKind,
} from '../utils/remoteAsset'

export interface UseCardImageSrcOptions {
  id?: string
  kind?: CardImageKind
  strategy?: AssetStrategy
  /** When true, probe primary and switch to fallback if needed (for backgrounds). */
  probe?: boolean
}

function buildImageCandidates(
  localPath: string | null | undefined,
  opts?: UseCardImageSrcOptions,
): string[] {
  const list: string[] = []
  const push = (url: string) => {
    if (url && !list.includes(url)) list.push(url)
  }

  if (opts?.kind === 'art_crop') {
    const art = assetCandidates(localPath, { ...opts, kind: 'art_crop' })
    const normal = assetCandidates(localPath, { ...opts, kind: 'normal' })
    // Prefer remote art_crop; avoid jumping straight to a local full-face JPG.
    if (art.remote) push(art.remote)
    if (art.local && /(?:^|\/)[^/]*-art\./i.test(art.local)) push(art.local)
    if (normal.remote) push(normal.remote)
    push(normal.local || art.local)
    return list.length ? list : ['']
  }

  const { primary, fallback } = assetCandidates(localPath, opts)
  push(primary)
  push(fallback)
  return list.length ? list : ['']
}

/** Sync primary URL with onError-style fallback state for <img>. */
export function useCardImageSrc(
  localPath: string | null | undefined,
  opts?: UseCardImageSrcOptions,
): {
  src: string
  onError: (e?: SyntheticEvent<HTMLImageElement>) => void
  fallback: string
} {
  const candidates = buildImageCandidates(localPath, opts)
  const primary = candidates[0] ?? ''
  const fallback = candidates[1] ?? primary
  const [src, setSrc] = useState(primary)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setSrc(primary)
    setIdx(0)
  }, [primary, localPath, opts?.id, opts?.kind, opts?.strategy])

  useEffect(() => {
    if (!opts?.probe || !localPath) return
    let cancelled = false
    void resolveAssetUrl(localPath, opts).then((url) => {
      if (!cancelled) {
        setSrc(url)
        setIdx(0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [localPath, opts?.id, opts?.kind, opts?.strategy, opts?.probe])

  return {
    src,
    fallback,
    onError: () => {
      const next = idx + 1
      if (next < candidates.length && candidates[next]) {
        setIdx(next)
        setSrc(candidates[next]!)
      }
    },
  }
}

/** Background / style URL that resolves remote-first with probe. */
export function useResolvedCardImageUrl(
  localPath: string | null | undefined,
  opts?: UseCardImageSrcOptions,
): string {
  const { primary } = assetCandidates(localPath, opts)
  const [src, setSrc] = useState(primary)
  const pathKey = `${localPath ?? ''}|${opts?.kind ?? ''}|${opts?.id ?? ''}|${opts?.strategy ?? ''}`

  useEffect(() => {
    setSrc(primary)
    if (!localPath) return
    let cancelled = false
    void resolveAssetUrl(localPath, opts).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
    // pathKey captures meaningful opts fields (avoid new-object identity churn).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathKey encodes opts
  }, [pathKey, primary, localPath])

  return src
}

type CardImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  localPath: string | null | undefined
  cardId?: string
  kind?: CardImageKind
  strategy?: AssetStrategy
}

/** Drop-in <img> that prefers remote CDN and falls back to local on error. */
export function CardImage({
  localPath,
  cardId,
  kind,
  strategy,
  onError,
  ...rest
}: CardImageProps) {
  const image = useCardImageSrc(localPath, { id: cardId, kind, strategy })
  return (
    <img
      {...rest}
      src={image.src}
      decoding={rest.decoding ?? 'async'}
      onError={(e) => {
        image.onError(e)
        onError?.(e)
      }}
    />
  )
}

/** CSS background that prefers remote CDN (probed). */
export function RemoteArtBackground({
  localPath,
  cardId,
  kind = 'art_crop',
  className,
  style,
  ...rest
}: {
  localPath: string | null | undefined
  cardId?: string
  kind?: CardImageKind
  className?: string
  style?: CSSProperties
} & Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'>) {
  const url = useResolvedCardImageUrl(localPath, { id: cardId, kind })
  return (
    <div
      className={className}
      style={{
        ...style,
        ...(localPath ? { backgroundImage: `url(${url})` } : null),
      }}
      {...rest}
    />
  )
}
