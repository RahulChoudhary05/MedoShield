/**
 * Small, dependency-free UX hooks shared across the app:
 * debouncing, throttling, autosaved drafts, network status and keyboard shortcuts.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Value that only settles after `delay` ms without changes (search inputs, filters). */
export function useDebouncedValue(value, delay = 250) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return settled
}

/** Stable debounced callback. `.flush()` runs the pending call now, `.cancel()` drops it. */
export function useDebouncedCallback(fn, delay = 400) {
  const fnRef = useRef(fn)
  const timer = useRef(null)
  const lastArgs = useRef(null)
  fnRef.current = fn
  const cancel = useCallback(() => { clearTimeout(timer.current); timer.current = null }, [])
  const flush = useCallback(() => {
    if (!timer.current) return
    cancel()
    fnRef.current(...(lastArgs.current || []))
  }, [cancel])
  const debounced = useCallback((...args) => {
    lastArgs.current = args
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; fnRef.current(...args) }, delay)
  }, [delay])
  useEffect(() => cancel, [cancel])
  debounced.flush = flush
  debounced.cancel = cancel
  return debounced
}

/** Stable throttled callback: runs at most once per `interval` ms (leading + trailing). */
export function useThrottledCallback(fn, interval = 200) {
  const fnRef = useRef(fn)
  const last = useRef(0)
  const trailing = useRef(null)
  fnRef.current = fn
  useEffect(() => () => clearTimeout(trailing.current), [])
  return useCallback((...args) => {
    const now = Date.now()
    const wait = interval - (now - last.current)
    clearTimeout(trailing.current)
    if (wait <= 0) {
      last.current = now
      fnRef.current(...args)
    } else {
      trailing.current = setTimeout(() => { last.current = Date.now(); fnRef.current(...args) }, wait)
    }
  }, [interval])
}

const safeStorage = {
  get(key) { try { return window.localStorage.getItem(key) } catch { return null } },
  set(key, v) { try { window.localStorage.setItem(key, v) } catch { /* private mode / quota */ } },
  del(key) { try { window.localStorage.removeItem(key) } catch { /* ignore */ } },
}

/**
 * Autosaved draft kept in this browser only (never sent anywhere).
 * Returns [value, setValue, { status: 'idle'|'saving'|'saved', savedAt, clear }].
 * Use for free-text a person would hate to lose: messages, notes, profile edits.
 */
export function useAutosave(key, initial = '', delay = 600) {
  const storageKey = key ? `medo:draft:${key}` : null
  const read = () => {
    if (!storageKey) return initial
    const raw = safeStorage.get(storageKey)
    if (raw == null) return initial
    try { return JSON.parse(raw).v ?? initial } catch { return initial }
  }
  const [value, setValue] = useState(read)
  const [status, setStatus] = useState('idle')
  const [savedAt, setSavedAt] = useState(null)
  const first = useRef(true)

  // Re-read when the key changes (e.g. switching message threads).
  useEffect(() => {
    first.current = true
    setValue(read())
    setStatus('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return undefined
    if (first.current) { first.current = false; return undefined }
    setStatus('saving')
    const t = setTimeout(() => {
      const empty = value == null || value === '' || (typeof value === 'object' && !Object.values(value).some(Boolean))
      if (empty) safeStorage.del(storageKey)
      else safeStorage.set(storageKey, JSON.stringify({ v: value, t: Date.now() }))
      setSavedAt(new Date())
      setStatus('saved')
    }, delay)
    return () => clearTimeout(t)
  }, [value, storageKey, delay])

  const clear = useCallback(() => {
    if (storageKey) safeStorage.del(storageKey)
    setValue(initial)
    setStatus('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  return [value, setValue, { status, savedAt, clear }]
}

const subscribeOnline = (cb) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}

/** true while the browser reports a network connection. */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

const isTyping = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * Global keyboard shortcuts. `map` keys look like 'mod+k', 'shift+/', '?', 'g h' (a two-key sequence).
 * Plain-key shortcuts are ignored while the person is typing in a field; 'mod+' ones always fire.
 */
export function useHotkeys(map, enabled = true) {
  const mapRef = useRef(map)
  mapRef.current = map
  useEffect(() => {
    if (!enabled) return undefined
    let prefix = null
    let prefixTimer = null
    const onKey = (e) => {
      if (e.defaultPrevented || e.repeat) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
      const mod = e.metaKey || e.ctrlKey
      const typing = isTyping(e.target)
      const entries = Object.entries(mapRef.current)
      if (mod) {
        const hit = entries.find(([k]) => k === `mod+${key}`)
        if (hit) { e.preventDefault(); hit[1](e) }
        return
      }
      if (typing || e.altKey) return
      if (prefix) {
        const hit = entries.find(([k]) => k === `${prefix} ${key}`)
        prefix = null
        clearTimeout(prefixTimer)
        if (hit) { e.preventDefault(); hit[1](e); return }
      }
      if (entries.some(([k]) => k.startsWith(`${key} `))) {
        prefix = key
        prefixTimer = setTimeout(() => { prefix = null }, 900)
        return
      }
      const hit = entries.find(([k]) => k === key)
      if (hit) { e.preventDefault(); hit[1](e) }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(prefixTimer) }
  }, [enabled])
}

/** Warn before leaving the page while `when` is true (unsaved work, an upload in progress). */
export function useBeforeUnload(when) {
  useEffect(() => {
    if (!when) return undefined
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [when])
}
