'use client'

import { ExternalLink, MessageSquare, TrendingUp, Clock, Flame, Bookmark } from 'lucide-react'
import { Article } from '@/types/news'
import { timeAgo, getHotnessLevel } from '@/lib/hotness'
import { getTagStyle } from '@/lib/tags'

interface NewsCardProps {
  article: Article
  index: number
  onTagClick?: (tag: string) => void
  onArticleClick?: (article: Article) => void
}

export function NewsCard({ article, index, onTagClick, onArticleClick }: NewsCardProps) {
  const hotnessLevel = getHotnessLevel(article.hotnessScore)
  const domain = getDomain(article.url)

  const handleCardClick = () => {
    if (onArticleClick) {
      onArticleClick(article)
    } else {
      window.open(article.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    if (onTagClick) {
      onTagClick(tag)
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={`group relative rounded-2xl bg-zinc-900/50 border border-white/5 
                  hover:border-white/10 hover:bg-zinc-900/80 transition-all duration-300
                  cursor-pointer select-text
                  opacity-0 animate-slide-up stagger-${Math.min(index + 1, 10)}`}
    >
      {/* Hot indicator */}
      {hotnessLevel === 'hot' && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 hot-badge">
            <Flame className="w-3 h-3 text-rose-400" />
            <span className="text-xs font-medium text-rose-400">Hot</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Rank + Domain */}
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-sm font-mono text-zinc-500">
            {index + 1}
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            {domain}
          </span>
          <div className="flex-1" />
          <ExternalLink className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Title - primary link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          <h2 className="text-lg font-semibold leading-snug mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
            {article.title}
          </h2>
        </a>

        {/* Summary (if available) */}
        {article.summary && (
          <p className="text-sm text-zinc-400 leading-relaxed mb-3">
            {typeof article.summary === 'string' 
              ? article.summary 
              : (article.summary as { what?: string }).what || ''}
          </p>
        )}

        {/* Tags - now clickable for filtering */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => handleTagClick(e, tag)}
                className={`tag ${getTagStyle(tag)} hover:scale-105 transition-transform`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Footer: Metadata */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {/* Points */}
          {article.points !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{article.points} pts</span>
            </div>
          )}

          {/* Comments - opens HN discussion */}
          {article.commentCount !== undefined && article.hnUrl && (
            <a
              href={article.hnUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{article.commentCount}</span>
            </a>
          )}

          {/* Time */}
          <div className="flex items-center gap-1" title={new Date(article.publishedAt).toLocaleString()}>
            <Clock className="w-3.5 h-3.5" />
            <span>{timeAgo(article.publishedAt)}</span>
          </div>

          {/* Author */}
          {article.author && (
            <span className="hidden sm:inline text-zinc-600">
              by {article.author}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}
