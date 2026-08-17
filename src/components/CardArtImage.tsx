import { useEffect, useRef, useState } from 'react'

interface CardArtImageProps {
  src: string
  alt: string
  className?: string
  draggable?: boolean
  decoding?: 'async' | 'auto' | 'sync'
  onError?: () => void
}

/**
 * Shows an empty card-frame silhouette until the face art finishes loading.
 * Uses `.card-art` clip shell so Scryfall JPG corners are masked like set gallery tiles.
 */
export function CardArtImage({
  src,
  alt,
  className,
  draggable = false,
  decoding = 'async',
  onError,
}: CardArtImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  return (
    <span
      className={['card-art', loaded ? 'is-loaded' : 'is-pending', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="card-art-frame" aria-hidden="true" />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={draggable}
        decoding={decoding}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true)
          onError?.()
        }}
      />
    </span>
  )
}
