export interface StructuredSummary {
  what: string
  whyItMatters: string
  keyDetail?: string
}

export type SummarySource = 'title-only' | 'with-content' | 'with-comments'

export interface Article {
  id: string
  source: 'hackernews' | 'ars' | 'techmeme' | 'producthunt'
  externalId: string
  url: string
  title: string
  author?: string
  publishedAt: Date
  fetchedAt: Date
  excerpt?: string
  summary?: string | StructuredSummary
  summarySource?: SummarySource
  tags: string[]
  imageUrl?: string
  
  // Engagement metrics (source-dependent)
  points?: number
  commentCount?: number
  
  // Computed
  hotnessScore: number
  
  // HN specific
  hnUrl?: string
  
  // Extracted content (for better summaries)
  contentText?: string
}

export interface HNStory {
  id: number
  title: string
  url?: string
  by: string
  time: number
  score: number
  descendants: number
  type: string
  text?: string
  kids?: number[] // comment IDs
}

export interface HNComment {
  id: number
  by: string
  text: string
  time: number
  kids?: number[]
}

export interface NewsResponse {
  articles: Article[]
  fetchedAt: string
  cached: boolean
  totalCount: number
  page?: number
  totalPages?: number
}
