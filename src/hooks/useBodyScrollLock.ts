import { useEffect } from 'react'

/**
 * Lock document scroll while a full-viewport overlay is up (e.g. arena preload).
 * Uses position:fixed + scroll restore so mobile browsers cannot rubber-band underneath.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    }

    html.classList.add('is-setup-preloading')
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    const preventScroll = (event: Event) => {
      event.preventDefault()
    }
    document.addEventListener('touchmove', preventScroll, { passive: false })
    document.addEventListener('wheel', preventScroll, { passive: false })

    return () => {
      html.classList.remove('is-setup-preloading')
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      document.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('wheel', preventScroll)
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
