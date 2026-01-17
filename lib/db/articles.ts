import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { Article, StructuredSummary, SummarySource } from '@/types/news'
import { ArticleRow, ArticleInsert } from '@/types/database'

/**
 * Convert Article to database row format
 */
function articleToRow(article: Article): ArticleInsert {
  return {
    id: article.id,
    source: article.source,
    external_id: article.externalId,
    url: article.url,
    title: article.title,
    author: article.author || null,
    published_at: new Date(article.publishedAt).toISOString(),
    fetched_at: new Date(article.fetchedAt).toISOString(),
    points: article.points ?? null,
    comment_count: article.commentCount ?? null,
    hn_url: article.hnUrl || null,
    tags: article.tags,
    summary: typeof article.summary === 'object' ? article.summary as StructuredSummary : null,
    summary_source: article.summarySource || null,
    hotness_score: article.hotnessScore,
    content_text: article.contentText || null,
  }
}

/**
 * Convert database row to Article format
 */
function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    source: row.source as Article['source'],
    externalId: row.external_id,
    url: row.url,
    title: row.title,
    author: row.author || undefined,
    publishedAt: new Date(row.published_at),
    fetchedAt: new Date(row.fetched_at),
    points: row.points ?? undefined,
    commentCount: row.comment_count ?? undefined,
    hnUrl: row.hn_url || undefined,
    tags: row.tags || [],
    summary: row.summary || undefined,
    summarySource: (row.summary_source as SummarySource) || undefined,
    hotnessScore: row.hotness_score,
    contentText: row.content_text || undefined,
  }
}

/**
 * Upsert articles to database
 * Uses ON CONFLICT to handle duplicates - updates existing articles with fresh data
 * while preserving summaries
 */
export async function upsertArticles(articles: Article[]): Promise<{ inserted: number; updated: number; errors: number }> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    console.log('[db] Supabase not configured, skipping upsert')
    return { inserted: 0, updated: 0, errors: 0 }
  }
  
  // First, check which articles already exist
  const articleIds = articles.map(a => a.id)
  const { data: existingArticles } = await supabase
    .from('articles')
    .select('id')
    .in('id', articleIds)
  
  const existingIds = new Set((existingArticles || []).map(a => a.id))
  
  // Prepare rows - for existing articles, don't overwrite summary
  const rows = articles.map(article => {
    const row = articleToRow(article)
    // If article exists and we're updating, preserve the summary
    if (existingIds.has(article.id)) {
      // Remove summary fields so they don't get overwritten
      const { summary, summary_source, ...updateRow } = row
      return { ...updateRow, summary: undefined, summary_source: undefined }
    }
    return row
  })
  
  // Upsert all articles
  const { data, error } = await supabase
    .from('articles')
    .upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    .select('id')
  
  if (error) {
    console.error('[db] Error upserting articles:', error)
    return { inserted: 0, updated: 0, errors: articles.length }
  }
  
  const upsertedIds = new Set((data || []).map(a => a.id))
  let inserted = 0
  let updated = 0
  
  for (const id of upsertedIds) {
    if (existingIds.has(id)) {
      updated++
    } else {
      inserted++
    }
  }
  
  return { inserted, updated, errors: 0 }
}

/**
 * Get articles from database with filtering and sorting
 */
export async function getArticles(options: {
  sort?: 'hot' | 'new' | 'comments'
  range?: '24h' | '7d' | '30d' | 'all'
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<{ articles: Article[]; totalCount: number }> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return { articles: [], totalCount: 0 }
  }
  
  const { sort = 'hot', range = '24h', tags, limit = 30, offset = 0 } = options
  
  // Calculate time cutoff
  const now = new Date()
  const rangeMs: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  }
  
  let query = supabase.from('articles').select('*', { count: 'exact' })
  
  // Time filter
  if (range !== 'all') {
    const cutoff = new Date(now.getTime() - rangeMs[range]).toISOString()
    query = query.gte('published_at', cutoff)
  }
  
  // Tag filter
  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }
  
  // Sorting
  switch (sort) {
    case 'hot':
      query = query.order('hotness_score', { ascending: false })
      break
    case 'new':
      query = query.order('published_at', { ascending: false })
      break
    case 'comments':
      query = query.order('comment_count', { ascending: false, nullsFirst: false })
      break
  }
  
  // Pagination
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('[db] Error fetching articles:', error)
    return { articles: [], totalCount: 0 }
  }
  
  return {
    articles: (data || []).map(rowToArticle),
    totalCount: count || 0,
  }
}

/**
 * Search articles using full-text search
 */
export async function searchArticles(options: {
  query: string
  tags?: string[]
  fromDate?: string
  toDate?: string
  sort?: 'relevance' | 'hot' | 'new'
  limit?: number
  offset?: number
}): Promise<{ articles: Article[]; totalCount: number }> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return { articles: [], totalCount: 0 }
  }
  
  const { query, tags, fromDate, toDate, sort = 'relevance', limit = 30, offset = 0 } = options
  
  let dbQuery = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .textSearch('search_vector', query, { type: 'websearch' })
  
  // Date range filter
  if (fromDate) {
    dbQuery = dbQuery.gte('published_at', fromDate)
  }
  if (toDate) {
    dbQuery = dbQuery.lte('published_at', toDate)
  }
  
  // Tag filter
  if (tags && tags.length > 0) {
    dbQuery = dbQuery.overlaps('tags', tags)
  }
  
  // Sorting
  if (sort === 'hot') {
    dbQuery = dbQuery.order('hotness_score', { ascending: false })
  } else if (sort === 'new') {
    dbQuery = dbQuery.order('published_at', { ascending: false })
  }
  // 'relevance' uses default text search ranking
  
  // Pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1)
  
  const { data, error, count } = await dbQuery
  
  if (error) {
    console.error('[db] Error searching articles:', error)
    return { articles: [], totalCount: 0 }
  }
  
  return {
    articles: (data || []).map(rowToArticle),
    totalCount: count || 0,
  }
}

/**
 * Get article by ID
 */
export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return null
  }
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return rowToArticle(data)
}

/**
 * Get related articles by tag similarity
 */
export async function getRelatedArticles(articleId: string, tags: string[], limit = 5): Promise<Article[]> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase || tags.length === 0) {
    return []
  }
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .overlaps('tags', tags)
    .neq('id', articleId)
    .order('published_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('[db] Error fetching related articles:', error)
    return []
  }
  
  return (data || []).map(rowToArticle)
}

/**
 * Check if article exists by external ID
 */
export async function articleExists(source: string, externalId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return false
  }
  
  const { count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('source', source)
    .eq('external_id', externalId)
  
  return (count || 0) > 0
}

/**
 * Get articles that need summaries
 */
export async function getArticlesNeedingSummary(limit = 10): Promise<Article[]> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return []
  }
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .is('summary', null)
    .order('hotness_score', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('[db] Error fetching articles needing summary:', error)
    return []
  }
  
  return (data || []).map(rowToArticle)
}

/**
 * Update article summary
 */
export async function updateArticleSummary(
  id: string, 
  summary: StructuredSummary, 
  summarySource: SummarySource
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return false
  }
  
  const updateData = { 
    summary, 
    summary_source: summarySource,
    updated_at: new Date().toISOString(),
  }
  
  const { error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('[db] Error updating article summary:', error)
    return false
  }
  
  return true
}

