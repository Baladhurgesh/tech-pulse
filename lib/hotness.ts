import { Article } from '@/types/news'

const SOURCE_WEIGHTS: Record<string, number> = {
  hackernews: 1.3,    // High signal for trending
  ars: 1.1,           // Quality reporting
  techmeme: 1.2,      // Curated aggregator
  producthunt: 0.9,   // New products, less "news"
}

/**
 * Compute hotness score for an article
 * 
 * Formula: recency * (1 + engagement) * sourceWeight
 * 
 * - recency: exponential decay based on age (half-life = tau hours)
 * - engagement: log-scaled combination of points and comments
 * - sourceWeight: multiplier based on source quality
 */
export function computeHotness(article: Article): number {
  const now = Date.now()
  const publishedTime = new Date(article.publishedAt).getTime()
  const ageHours = (now - publishedTime) / (1000 * 60 * 60)
  
  // Recency decay with 12-hour half-life
  const tau = 12
  const recency = Math.exp(-ageHours / tau)
  
  // Engagement score (log-scaled to prevent outliers dominating)
  const points = article.points || 0
  const comments = article.commentCount || 0
  const engagement = Math.log(1 + points + 2 * comments)
  
  // Source weight
  const sourceWeight = SOURCE_WEIGHTS[article.source] || 1.0
  
  // Combined score
  const score = recency * (1 + engagement) * sourceWeight
  
  return Math.round(score * 1000) / 1000
}

/**
 * Get a human-readable time ago string
 */
export function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get hotness level for display (for UI badges)
 */
export function getHotnessLevel(score: number): 'hot' | 'warm' | 'normal' {
  if (score > 5) return 'hot'
  if (score > 2) return 'warm'
  return 'normal'
}

