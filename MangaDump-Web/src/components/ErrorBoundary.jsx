import { Component } from 'react'

// Catches rendering crashes and shows the message instead of a blank white screen.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
        <p className="text-sm text-mute">The page hit an unexpected error. Reloading usually fixes it.</p>
        <pre className="max-h-40 w-full overflow-auto rounded-lg border border-line bg-sunk p-3 text-left text-xs">
          {String(this.state.error?.message ?? this.state.error)}
        </pre>
        <button className="btn" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
