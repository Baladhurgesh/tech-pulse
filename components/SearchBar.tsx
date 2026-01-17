'use client'

import { Search, X, Filter } from 'lucide-react'
import { useState } from 'react'
import { getTagStyle } from '@/lib/tags'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  onClearTags: () => void
  availableTags: string[]
  resultCount: number
  totalCount: number
}

export function SearchBar({
  value,
  onChange,
  selectedTags,
  onTagToggle,
  onClearTags,
  availableTags,
  resultCount,
  totalCount,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search news..."
          className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 
                     placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 
                     focus:ring-2 focus:ring-cyan-500/20 transition-all text-base"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all
                      ${showFilters ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-zinc-500'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tags */}
      {showFilters && availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {availableTags.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`tag transition-all ${getTagStyle(tag)} ${
                  isSelected 
                    ? 'ring-2 ring-white/30 scale-105' 
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {tag}
                {isSelected && <X className="w-3 h-3 ml-1" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Result count */}
      {(value || selectedTags.length > 0) && (
        <p className="text-sm text-zinc-500 animate-fade-in">
          Showing {resultCount} of {totalCount} stories
          {selectedTags.length > 0 && (
            <button
              onClick={onClearTags}
              className="ml-2 text-cyan-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      )}
    </div>
  )
}
