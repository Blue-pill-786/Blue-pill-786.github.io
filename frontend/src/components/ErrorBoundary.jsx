import React from 'react';

/**
 * Advanced Error Boundary Component to catch and handle React errors gracefully
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // ✅ FIX: Vite env
    if (import.meta.env.VITE_SENTRY_DSN) {
      // Example: Sentry.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const isDev = import.meta.env.MODE === 'development'; // ✅ FIX

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h1 className="text-4xl font-bold text-red-300 mb-4">
              ⚠️ Oops! Something went wrong
            </h1>

            <p className="text-red-200 mb-6 text-lg">
              We encountered an unexpected error. Please try refreshing the page or go back.
            </p>

            {isDev && (
              <div className="rounded-xl bg-slate-900/50 p-4 mb-6 text-left border border-red-500/20 max-h-64 overflow-y-auto">
                <p className="text-red-300 font-mono text-sm mb-2">
                  {this.state.error?.toString()}
                </p>

                <details className="text-slate-400 text-xs mt-4">
                  <summary className="cursor-pointer font-semibold mb-2">
                    Stack Trace
                  </summary>

                  <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition"
              >
                🔄 Try Again
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-3 border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 font-semibold rounded-lg transition"
              >
                🏠 Go Home
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className="text-yellow-300 mt-6 text-sm">
                ⚠️ Multiple errors detected. This might be a persistent issue. Contact support if problem continues.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;