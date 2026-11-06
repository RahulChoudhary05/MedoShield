import { Component } from 'react'
import { RefreshCw } from 'lucide-react'

/** Catches render errors so one broken widget never blanks the whole app. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="font-display text-2xl font-semibold">Something didn't load properly</p>
          <p className="mt-2 text-ink-3">This part of MedoShield hit an unexpected error. Your data is safe — try reloading the page.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-md mt-6"><RefreshCw className="h-4 w-4" /> Reload</button>
        </div>
      </div>
    )
  }
}
