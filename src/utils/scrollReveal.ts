const hideTimers = new WeakMap<Element, number>()

function scrollElementFromTarget(target: EventTarget | null): Element | null {
  if (target === document || target === document.documentElement || target === document.body) {
    return document.documentElement
  }
  return target instanceof Element ? target : null
}

/** Show themed scrollbars only while an element is actively scrolling. */
export function installScrollRevealScrollbars(hideDelayMs = 900): () => void {
  const onScroll = (event: Event) => {
    const el = scrollElementFromTarget(event.target)
    if (!el) return
    el.classList.add('is-scrolling')
    const prev = hideTimers.get(el)
    if (prev != null) window.clearTimeout(prev)
    hideTimers.set(
      el,
      window.setTimeout(() => {
        el.classList.remove('is-scrolling')
        hideTimers.delete(el)
      }, hideDelayMs),
    )
  }

  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  return () => {
    document.removeEventListener('scroll', onScroll, true)
  }
}
