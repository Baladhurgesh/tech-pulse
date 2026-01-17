'use client'

import { Zap, RefreshCw, Github, Database } from 'lucide-react'

interface HeaderProps {
  onRefresh: () => void
  isLoading: boolean
  lastUpdated?: string
}

export function Header({ onRefresh, isLoading, lastUpdated }: HeaderProps) {
  const githubUrl = 'https://github.com/Baladhurgesh/tech-pulse'
  
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 blur-lg -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Tech<span className="text-cyan-400">Pulse</span>
              </h1>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Hottest tech news, AI-summarized
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Database status indicator */}
            {lastUpdated && (
              <div 
                className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 cursor-help"
                title={`Data from Supabase\nLast query: ${new Date(lastUpdated).toLocaleString()}\nAuto-updates every 10 minutes via cron`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Live • {formatRelativeTime(lastUpdated)}
                </span>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh from database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm hidden sm:inline">Refresh</span>
            </button>

            {/* GitHub link */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              title="View on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
