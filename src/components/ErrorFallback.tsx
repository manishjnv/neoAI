// ═══════════════════════════════════════════════════
// neoAI — Error Fallback UI
// ═══════════════════════════════════════════════════

interface Props {
  error: Error | null;
  onReset: () => void;
}

export function ErrorFallback({ error, onReset }: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-100 mb-2">Something went wrong</h2>

        <p className="text-gray-400 text-sm mb-6">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
