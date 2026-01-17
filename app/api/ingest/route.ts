import { NextResponse } from 'next/server'
import { fetchHackerNews } from '@/lib/sources/hackernews'
import { summarizeBatch, isOpenAIConfigured } from '@/lib/summarize'
import { upsertArticles, getArticlesNeedingSummary, updateArticleSummary } from '@/lib/db/articles'
import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for cron jobs

interface IngestStats {
  fetched: number
  newArticles: number
  updatedArticles: number
  summarized: number
  skippedDuplicates: number
  errors: number
  duration: number
}

/**
 * POST /api/ingest - Background ingestion endpoint for cron jobs
 * Runs every 60 minutes to:
 * 1. Fetch latest news from HackerNews
 * 2. Upsert to database (skip duplicates)
 * 3. Generate AI summaries for articles that don't have them
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  const stats: IngestStats = {
    fetched: 0,
    newArticles: 0,
    updatedArticles: 0,
    summarized: 0,
    skippedDuplicates: 0,
    errors: 0,
    duration: 0,
  }
  
  // Verify cron secret (for external cron jobs like Vercel Cron)
  // Allow requests without auth header (frontend refresh button)
  // Only reject if auth header is present but invalid
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (authHeader && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up Supabase.' },
      { status: 503 }
    )
  }
  
  let runId: string | null = null
  
  try {
    // Create ingest run record
    const supabase = getSupabaseAdmin()
    if (supabase) {
      const { data } = await supabase
        .from('ingest_runs')
        .insert({ status: 'running' })
        .select('id')
        .single()
      runId = data?.id || null
    }
    
    console.log('[ingest] Starting ingestion run...')
    
    // Step 1: Fetch latest news from Hacker News
    console.log('[ingest] Fetching from Hacker News...')
    const articles = await fetchHackerNews()
    stats.fetched = articles.length
    console.log(`[ingest] Fetched ${stats.fetched} articles`)
    
    // Step 2: Upsert to database (handles duplicates via ON CONFLICT)
    console.log('[ingest] Upserting to database...')
    const result = await upsertArticles(articles)
    stats.newArticles = result.inserted
    stats.updatedArticles = result.updated
    stats.errors = result.errors
    stats.skippedDuplicates = stats.fetched - stats.newArticles - stats.updatedArticles
    console.log(`[ingest] New: ${stats.newArticles}, Updated: ${stats.updatedArticles}, Errors: ${stats.errors}`)
    
    // Step 3: Generate summaries for articles that don't have them
    if (isOpenAIConfigured()) {
      console.log('[ingest] Checking for articles needing summaries...')
      
      // Get up to 15 articles that need summaries (prioritized by hotness)
      const needingSummary = await getArticlesNeedingSummary(15)
      
      if (needingSummary.length > 0) {
        console.log(`[ingest] Generating summaries for ${needingSummary.length} articles...`)
        
        // Summarize with content extraction for better quality
        const summarized = await summarizeBatch(needingSummary, {
          fetchContent: true,
          fetchComments: false,
          concurrency: 3,
        })
        
        // Update summaries in database
        for (const article of summarized) {
          if (article.summary && typeof article.summary === 'object') {
            const success = await updateArticleSummary(
              article.id,
              article.summary,
              article.summarySource || 'title-only'
            )
            if (success) {
              stats.summarized++
            }
          }
        }
        console.log(`[ingest] Generated ${stats.summarized} summaries`)
      } else {
        console.log('[ingest] All articles already have summaries')
      }
    } else {
      console.log('[ingest] OpenAI not configured, skipping summarization')
    }
    
    stats.duration = Date.now() - startTime
    
    // Update ingest run record
    if (supabase && runId) {
      await supabase
        .from('ingest_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          fetched_count: stats.fetched,
          inserted_count: stats.newArticles,
          updated_count: stats.updatedArticles,
          error_count: stats.errors,
        })
        .eq('id', runId)
    }
    
    console.log(`[ingest] Completed in ${stats.duration}ms`)
    console.log(`[ingest] Summary: ${stats.newArticles} new, ${stats.updatedArticles} updated, ${stats.summarized} summaries`)
    
    return NextResponse.json({
      success: true,
      stats,
      message: `Ingested ${stats.fetched} articles (${stats.newArticles} new), ${stats.summarized} summaries generated`,
    })
  } catch (error) {
    console.error('[ingest] Error:', error)
    stats.duration = Date.now() - startTime
    
    // Update ingest run record with error
    const supabase = getSupabaseAdmin()
    if (supabase && runId) {
      await supabase
        .from('ingest_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: String(error),
          fetched_count: stats.fetched,
          inserted_count: stats.newArticles,
          error_count: stats.errors + 1,
        })
        .eq('id', runId)
    }
    
    return NextResponse.json(
      { 
        error: 'Ingestion failed', 
        details: String(error),
        stats,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ingest - Health check and stats endpoint
 */
export async function GET() {
  const stats: Record<string, unknown> = {
    supabaseConfigured: isSupabaseConfigured(),
    openaiConfigured: isOpenAIConfigured(),
    cronSecretConfigured: !!process.env.CRON_SECRET,
    cronSchedule: 'Every 60 minutes',
  }
  
  // Get recent ingest runs if Supabase is configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()
    if (supabase) {
      const { data: recentRuns } = await supabase
        .from('ingest_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5)
      
      stats.recentRuns = recentRuns || []
      
      // Get total article count
      const { count } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
      
      stats.totalArticles = count || 0
      
      // Get articles with summaries count
      const { count: withSummaries } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .not('summary', 'is', null)
      
      stats.articlesWithSummaries = withSummaries || 0
    }
  }
  
  return NextResponse.json({
    status: 'ok',
    ...stats,
  })
}
