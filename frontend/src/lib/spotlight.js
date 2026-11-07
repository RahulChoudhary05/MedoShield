/**
 * Cursor spotlight for `.card-interactive` / `.spotlight` surfaces.
 * One delegated, rAF-throttled pointer listener for the whole app (no per-card handlers).
 */
export function installSpotlight() {
  if (typeof window === 'undefined' || !window.matchMedia?.('(hover: hover)').matches) return
  let frame = 0
  let last = null
  window.addEventListener('pointermove', (e) => {
    last = e
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const el = last?.target?.closest?.('.card-interactive, .spotlight')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${last.clientX - r.left}px`)
      el.style.setProperty('--my', `${last.clientY - r.top}px`)
    })
  }, { passive: true })
}
