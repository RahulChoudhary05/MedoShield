import { Component } from 'react'
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react'

const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
const RELOAD_FLAG = 'medo:chunk-reload'

/**
 * Graceful error recovery: one broken widget never blanks the whole app.
 * - After a new deploy, an old tab can ask for a code chunk that no longer exists: reload once, automatically.
 * - Otherwise offer "Try again" (re-render in place, keeps the rest of the page) before a full reload.
 * - `resetKey` (e.g. the pathname) clears the error when the person navigates elsewhere.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (CHUNK_ERROR.test(String(error?.message || error))) {
      let already = false
      try { already = sessionStorage.getItem(RELOAD_FLAG) === '1'; sessionStorage.setItem(RELOAD_FLAG, '1') } catch { /* ignore */ }
      if (!already) { window.location.reload(); return }
    }
    console.error('UI error', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = CHUNK_ERROR.test(String(this.state.error?.message || this.state.error))
    return (
      <div role="alert" className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="max-w-md">
          <h2 className="font-serif text-[2rem] font-semibold leading-tight text-ink">
            {chunk ? 'A newer version is available' : 'This part didn’t load'}
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-3">
            {chunk
              ? 'MedoShield was updated while this tab was open. Reload to get the latest version — nothing you saved is lost.'
              : 'Something unexpected went wrong in this section. Your saved data is safe. Try again, or reload the page if it keeps happening.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!chunk && (
              <button onClick={() => this.setState({ error: null })} className="btn btn-primary btn-md">
                <RotateCcw className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Try again
              </button>
            )}
            <button onClick={() => window.location.reload()} className={`btn btn-md ${chunk ? 'btn-primary' : 'btn-outline'}`}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Reload page
            </button>
            {!chunk && (
              <button onClick={() => window.history.back()} className="btn btn-ghost btn-md">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Go back
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
