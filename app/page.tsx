'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Header } from '@/components/Header'
import { SearchBar } from '@/components/SearchBar'
import { NewsCard } from '@/components/NewsCard'
import { SortControls, SortOption, TimeRange } from '@/components/SortControls'
import { LoadingState, EmptyState, ErrorState } from '@/components/LoadingState'
import { ArticleDrawer } from '@/components/ArticleDrawer'
import { Article, NewsResponse } from '@/types/news'

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>()
  const [totalCount, setTotalCount] = useState(0)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Sort and time range state
  const [sort, setSort] = useState<SortOption>('hot')
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  
  // Article drawer state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  
  // Ingestion state
  const [isIngesting, setIsIngesting] = useState(false)

  // Fetch news from API (always from database)
  const fetchNews = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.set('sort', sort)
      params.set('range', timeRange)
      
      const url = `/api/news?${params.toString()}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch: ${response.status}`)
      }
      
      const data: NewsResponse = await response.json()
      
      // Convert date strings back to Date objects
      const articlesWithDates = data.articles.map(article => ({
        ...article,
        publishedAt: new Date(article.publishedAt),
        fetchedAt: new Date(article.fetchedAt),
      }))
      
      setArticles(articlesWithDates)
      setLastUpdated(data.fetchedAt)
      setTotalCount(data.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news')
    } finally {
      setIsLoading(false)
    }
  }, [sort, timeRange])
  
  // Trigger ingestion (fetch fresh news from HackerNews, add to DB, generate summaries)
  const triggerIngest = useCallback(async () => {
    setIsIngesting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Ingestion failed: ${response.status}`)
      }
      
      // After successful ingestion, fetch the updated news
      await fetchNews()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh news')
    } finally {
      setIsIngesting(false)
    }
  }, [fetchNews])

  // Initial load and refetch on sort/time change
  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  // Extract all available tags from articles
  const availableTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    articles.forEach(article => {
      article.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    // Sort by count and return top tags
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag)
  }, [articles])

  // Filter articles based on search and tags (client-side)
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const summaryText = typeof article.summary === 'string' 
          ? article.summary 
          : (article.summary as { what?: string })?.what || ''
        
        const matchesSearch = 
          article.title.toLowerCase().includes(query) ||
          summaryText.toLowerCase().includes(query) ||
          article.author?.toLowerCase().includes(query) ||
          article.tags.some(tag => tag.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }
      
      // Tag filter
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some(tag => article.tags.includes(tag))
        if (!hasTag) return false
      }
      
      return true
    })
  }, [articles, searchQuery, selectedTags])

  // Toggle tag selection
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  // Clear all tags
  const handleClearTags = () => {
    setSelectedTags([])
  }
  
  // Handle tag click from article card
  const handleTagClick = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
  }

  return (
    <div className="min-h-screen">
      <Header 
        onRefresh={triggerIngest}
        isLoading={isLoading || isIngesting}
        lastUpdated={lastUpdated}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero section */}
        <section className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Today's Hottest Tech News
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Curated from Hacker News, ranked by engagement, and summarized by AI.
            {!isLoading && articles.length > 0 && (
              <span className="block mt-1 text-sm">
                {totalCount} stories in database • Auto-updates hourly
              </span>
            )}
          </p>
        </section>

        {/* Sort controls */}
        {!isLoading && articles.length > 0 && (
          <section className="mb-6 animate-fade-in">
            <SortControls
              sort={sort}
              onSortChange={setSort}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </section>
        )}

        {/* Search and filters */}
        {!isLoading && articles.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              onClearTags={handleClearTags}
              availableTags={availableTags}
              resultCount={filteredArticles.length}
              totalCount={articles.length}
            />
          </section>
        )}

        {/* News grid */}
        <section>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchNews} />
          ) : filteredArticles.length === 0 ? (
            <EmptyState 
              message={
                searchQuery || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "No news available. The database may need to be populated - check /api/ingest"
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map((article, index) => (
                <NewsCard 
                  key={article.id} 
                  article={article} 
                  index={index}
                  onTagClick={handleTagClick}
                  onArticleClick={setSelectedArticle}
                />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-white/5 text-center text-sm text-zinc-600">
          <p>
            Data from{' '}
            <a 
              href="https://news.ycombinator.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 hover:underline"
            >
              Hacker News
            </a>
            {' '}• Summaries by{' '}
            <a 
              href="https://openai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 hover:underline"
            >
              OpenAI
            </a>
          </p>
          <p className="mt-2 text-zinc-700">
            Built with Next.js • Auto-updates every hour
          </p>
        </footer>
      </main>
      
      {/* Article Detail Drawer */}
      <ArticleDrawer
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onTagClick={handleTagClick}
      />
    </div>
  )
}
