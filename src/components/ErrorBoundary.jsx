import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Freedom Plan AMS Runtime Error:', error, errorInfo)
  }

  handleReset = () => {
    try {
      window.localStorage.clear()
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper-50 dark:bg-ink-950 p-4 text-ink-950 dark:text-paper-50 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-ink-900 rounded-2xl border border-ink-200/20 dark:border-ink-800 p-6 shadow-xl text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="font-display text-lg font-bold">Something went wrong</h2>
            <p className="text-sm text-ink-700/80 dark:text-paper-200/70">
              The application encountered an unexpected data structure or state. You can restore default settings and clear cached storage below.
            </p>
            {this.state.error && (
              <div className="text-left bg-paper-100 dark:bg-ink-950/80 p-3 rounded-lg border border-ink-200/10 text-[11px] font-mono text-rose-500 overflow-x-auto max-h-32">
                {String(this.state.error.message || this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-xl bg-marigold-500 hover:bg-marigold-600 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Reset App Data & Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
