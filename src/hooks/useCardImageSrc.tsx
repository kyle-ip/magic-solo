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

/** Sync primary URL with onError-style fallback state for <img>. */
export function useCardImageSrc(
  localPath: string | null | undefined,
  opts?: UseCardImageSrcOptions,
): {
  src: string
  onError: (e?: SyntheticEvent<HTMLImageElement>) => void
  fallback: string
} {
  const { primary, fallback } = assetCandidates(localPath, opts)
  const [src, setSrc] = useState(primary)

  useEffect(() => {
    setSrc(primary)
  }, [primary])

  useEffect(() => {
    if (!opts?.probe || !localPath) return
    let cancelled = false
    void resolveAssetUrl(localPath, opts).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [localPath, opts?.id, opts?.kind, opts?.strategy, opts?.probe])

  return {
    src,
    fallback,
    onError: () => {
      if (src !== fallback && fallback) setSrc(fallback)
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
  }, [localPath, primary, opts?.id, opts?.kind, opts?.strategy])

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
