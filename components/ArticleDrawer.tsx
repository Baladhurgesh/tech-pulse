'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, MessageSquare, TrendingUp, Clock, Share2, Check, ChevronRight } from 'lucide-react'
import { Article, StructuredSummary } from '@/types/news'
import { timeAgo } from '@/lib/hotness'
import { getTagStyle } from '@/lib/tags'

interface ArticleDrawerProps {
  article: Article | null
  onClose: () => void
  onTagClick?: (tag: string) => void
}

interface RelatedArticle {
  id: string
  title: string
  url: string
  tags: string[]
  publishedAt: Date
}

export function ArticleDrawer({ article, onClose, onTagClick }: ArticleDrawerProps) {
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])
  
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (article) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [article])
  
  // Fetch related articles
  useEffect(() => {
    if (!article || article.tags.length === 0) {
      setRelatedArticles([])
      return
    }
    
    const fetchRelated = async () => {
      setIsLoadingRelated(true)
      try {
        const params = new URLSearchParams({
          tags: article.tags.join(','),
          limit: '5',
        })
        const response = await fetch(`/api/search?${params}`)
        if (response.ok) {
          const data = await response.json()
          // Filter out current article
          const related = data.articles
            .filter((a: Article) => a.id !== article.id)
            .slice(0, 4)
            .map((a: Article) => ({
              id: a.id,
              title: a.title,
              url: a.url,
              tags: a.tags,
              publishedAt: new Date(a.publishedAt),
            }))
          setRelatedArticles(related)
        }
      } catch (error) {
        console.error('Failed to fetch related articles:', error)
      } finally {
        setIsLoadingRelated(false)
      }
    }
    
    fetchRelated()
  }, [article])
  
  const handleShare = async () => {
    if (!article) return
    
    // Helper function to copy text to clipboard
    const copyToClipboard = async (text: string): Promise<boolean> => {
      // Try modern Clipboard API first (requires secure context)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch {
          // Fall through to legacy method
        }
      }
      
      // Fallback: use execCommand with a temporary textarea
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        // Prevent scrolling to bottom
        textArea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        return success
      } catch {
        return false
      }
    }
    
    // Try to copy to clipboard first (expected behavior for "Copy link")
    const success = await copyToClipboard(article.url)
    
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      // If clipboard fails, try Web Share API as fallback (mainly for mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: article.title,
            url: article.url,
          })
        } catch {
          // Share was cancelled or failed - that's okay
        }
      }
    }
  }
  
  if (!article) return null
  
  const summary = article.summary as StructuredSummary | string | undefined
  const isStructuredSummary = summary && typeof summary === 'object'
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-zinc-900 border-l border-white/10 z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Article Details</span>
            {article.summarySource && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {article.summarySource === 'with-content' ? 'Full analysis' : 
                 article.summarySource === 'with-comments' ? 'With discussion' : 'Quick summary'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold leading-tight mb-3">
              {article.title}
            </h2>
            
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              {article.points !== undefined && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {article.points} points
                </span>
              )}
              {article.commentCount !== undefined && (
                <a 
                  href={article.hnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {article.commentCount} comments
                </a>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {timeAgo(article.publishedAt)}
              </span>
              {article.author && (
                <span className="text-zinc-500">by {article.author}</span>
              )}
            </div>
          </div>
          
          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onTagClick?.(tag)
                    onClose()
                  }}
                  className={`tag ${getTagStyle(tag)} hover:scale-105 transition-transform`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          
          {/* Summary */}
          {summary && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
                AI Summary
              </h3>
              
              {isStructuredSummary ? (
                <div className="space-y-3">
                  {/* What happened */}
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-xs font-medium text-cyan-400 mb-1">What happened</p>
                    <p className="text-zinc-200">{(summary as StructuredSummary).what}</p>
                  </div>
                  
                  {/* Why it matters */}
                  <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                    <p className="text-xs font-medium text-violet-400 mb-1">Why it matters</p>
                    <p className="text-zinc-200">{(summary as StructuredSummary).whyItMatters}</p>
                  </div>
                  
                  {/* Key detail */}
                  {(summary as StructuredSummary).keyDetail && (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-400 mb-1">Key detail</p>
                      <p className="text-zinc-200">{(summary as StructuredSummary).keyDetail}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-zinc-300 leading-relaxed">{summary as string}</p>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Read Article
            </a>
            <button
              onClick={handleShare}
              className={`px-4 py-3 rounded-xl border transition-all ${
                copied 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              title={copied ? 'Copied!' : 'Share / Copy link'}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Related Stories */}
          {(relatedArticles.length > 0 || isLoadingRelated) && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
                Related Stories
              </h3>
              
              {isLoadingRelated ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {relatedArticles.map((related) => (
                    <a
                      key={related.id}
                      href={related.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-cyan-400 transition-colors">
                          {related.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {timeAgo(related.publishedAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

