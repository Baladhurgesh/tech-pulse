'use client'

export function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-2xl bg-zinc-900/50 border border-white/5 p-5 
                      opacity-0 animate-fade-in stagger-${Math.min(i + 1, 10)}`}
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-lg skeleton" />
            <div className="w-24 h-4 rounded skeleton" />
          </div>

          {/* Title skeleton */}
          <div className="space-y-2 mb-3">
            <div className="w-full h-5 rounded skeleton" />
            <div className="w-3/4 h-5 rounded skeleton" />
          </div>

          {/* Summary skeleton */}
          <div className="w-full h-4 rounded skeleton mb-3" />

          {/* Tags skeleton */}
          <div className="flex gap-2 mb-3">
            <div className="w-12 h-5 rounded-full skeleton" />
            <div className="w-16 h-5 rounded-full skeleton" />
          </div>

          {/* Footer skeleton */}
          <div className="flex gap-4">
            <div className="w-16 h-4 rounded skeleton" />
            <div className="w-12 h-4 rounded skeleton" />
            <div className="w-14 h-4 rounded skeleton" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <span className="text-3xl">🔍</span>
      </div>
      <h3 className="text-lg font-medium text-zinc-400 mb-2">No stories found</h3>
      <p className="text-sm text-zinc-600 max-w-md">{message}</p>
    </div>
  )
}

export function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string
  onRetry: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h3 className="text-lg font-medium text-zinc-400 mb-2">Something went wrong</h3>
      <p className="text-sm text-zinc-600 max-w-md mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

