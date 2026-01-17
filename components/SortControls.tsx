'use client'

import { Flame, Clock, MessageSquare } from 'lucide-react'

export type SortOption = 'hot' | 'new' | 'comments'
export type TimeRange = '24h' | '7d' | '30d' | 'all'

interface SortControlsProps {
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

export function SortControls({ 
  sort, 
  onSortChange, 
  timeRange, 
  onTimeRangeChange 
}: SortControlsProps) {
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'hot', label: 'Hot', icon: <Flame className="w-3.5 h-3.5" /> },
    { value: 'new', label: 'New', icon: <Clock className="w-3.5 h-3.5" /> },
    { value: 'comments', label: 'Discussed', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  const timeOptions: { value: TimeRange; label: string }[] = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Sort options */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${sort === option.value 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Time range */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        {timeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onTimeRangeChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${timeRange === option.value 
                ? 'bg-violet-500/20 text-violet-400' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

