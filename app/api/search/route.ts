import { NextResponse } from 'next/server'
import { searchArticles, getArticles } from '@/lib/db/articles'
import { isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search - Full-text search endpoint
 * Searches articles in Supabase database
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const query = searchParams.get('q') || ''
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined
  const fromDate = searchParams.get('from') || undefined
  const toDate = searchParams.get('to') || undefined
  const sort = (searchParams.get('sort') as 'relevance' | 'hot' | 'new') || 'relevance'
  const limit = parseInt(searchParams.get('limit') || '30', 10)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const offset = (page - 1) * limit
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: 'Please configure Supabase environment variables.'
        },
        { status: 503 }
      )
    }
    
    if (query) {
      // Full-text search
      const { articles, totalCount } = await searchArticles({
        query,
        tags,
        fromDate,
        toDate,
        sort,
        limit,
        offset,
      })
      
      return NextResponse.json({
        articles,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        query,
      })
    } else {
      // No query - just filter/sort
      const { articles, totalCount } = await getArticles({
        tags,
        limit,
        offset,
        sort: sort === 'relevance' ? 'hot' : sort,
      })
      
      return NextResponse.json({
        articles,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      })
    }
  } catch (error) {
    console.error('[search] Error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    )
  }
}
