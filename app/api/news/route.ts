import { NextResponse } from 'next/server'
import { getArticles } from '@/lib/db/articles'
import { isSupabaseConfigured } from '@/lib/supabase'
import { NewsResponse } from '@/types/news'

export const dynamic = 'force-dynamic'

type SortOption = 'hot' | 'new' | 'comments'
type TimeRange = '24h' | '7d' | '30d' | 'all'

/**
 * GET /api/news - Fetch articles from database
 * No caching - always reads from Supabase
 * Data is populated by the /api/ingest cron job
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sort = (searchParams.get('sort') as SortOption) || 'hot'
  const range = (searchParams.get('range') as TimeRange) || '24h'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '30', 10)
  const offset = (page - 1) * limit
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { 
          error: 'Database not configured', 
          message: 'Please configure Supabase environment variables. See env.example for details.' 
        },
        { status: 503 }
      )
    }
    
    console.log(`[news] Fetching articles: sort=${sort}, range=${range}, page=${page}`)
    
    // Fetch from database
    const { articles, totalCount } = await getArticles({
      sort,
      range,
      limit,
      offset,
    })
    
    const response: NewsResponse = {
      articles,
      fetchedAt: new Date().toISOString(),
      cached: false,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[news] Error fetching news:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch news', details: String(error) },
      { status: 500 }
    )
  }
}
