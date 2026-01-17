import OpenAI from 'openai'
import { Article, StructuredSummary, SummarySource } from '@/types/news'
import { extractContent, fetchHNComments } from './content-extractor'

// Lazy initialization to avoid errors when OPENAI_API_KEY is not set
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  
  return openaiClient
}

interface SummarizeResult {
  summary: StructuredSummary
  source: SummarySource
}

/**
 * Generate a structured summary for an article using OpenAI
 */
export async function summarizeArticle(
  article: Article,
  options: { fetchContent?: boolean; fetchComments?: boolean } = {}
): Promise<SummarizeResult | null> {
  const openai = getOpenAI()
  
  if (!openai) {
    return null
  }
  
  try {
    // Gather context
    let contentContext = ''
    let summarySource: SummarySource = 'title-only'
    
    // Try to fetch article content
    if (options.fetchContent !== false) {
      const extracted = await extractContent(article.url)
      if (extracted?.description || extracted?.content) {
        contentContext = `\nArticle excerpt: ${extracted.description || ''}\n${extracted.content || ''}`.slice(0, 800)
        summarySource = 'with-content'
      }
    }
    
    // Try to fetch HN comments for context
    if (options.fetchComments && article.source === 'hackernews') {
      const storyId = parseInt(article.externalId, 10)
      if (!isNaN(storyId)) {
        const comments = await fetchHNComments(storyId, 3)
        if (comments.length > 0) {
          contentContext += `\n\nTop HN comments:\n${comments.map(c => `- ${c}`).join('\n')}`
          summarySource = 'with-comments'
        }
      }
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a tech news summarizer. Generate a structured JSON summary with these exact fields:
{
  "what": "One sentence describing what happened or what this is about",
  "whyItMatters": "One sentence on why tech professionals should care",
  "keyDetail": "One notable number, quote, or specific claim (optional, omit if none)"
}

Rules:
- Each field should be under 25 words
- Be factual and specific, not vague
- Don't start with "This article..." or "The article..."
- Return ONLY valid JSON, no markdown or explanation`,
        },
        {
          role: 'user',
          content: `Title: ${article.title}
Source: Hacker News (${article.points} points, ${article.commentCount} comments)
URL: ${article.url}
Tags: ${article.tags.join(', ') || 'General Tech'}${contentContext}

Generate the JSON summary:`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })
    
    const content = response.choices[0]?.message?.content?.trim()
    if (!content) return null
    
    try {
      const parsed = JSON.parse(content) as StructuredSummary
      
      // Validate structure
      if (!parsed.what || !parsed.whyItMatters) {
        console.error('[summarize] Invalid summary structure:', parsed)
        return null
      }
      
      return {
        summary: {
          what: parsed.what,
          whyItMatters: parsed.whyItMatters,
          keyDetail: parsed.keyDetail || undefined,
        },
        source: summarySource,
      }
    } catch (parseError) {
      console.error('[summarize] Failed to parse JSON:', content)
      return null
    }
  } catch (error) {
    console.error('[summarize] Error:', error)
    return null
  }
}

/**
 * Summarize multiple articles in batch
 */
export async function summarizeBatch(
  articles: Article[],
  options: { fetchContent?: boolean; fetchComments?: boolean; concurrency?: number } = {}
): Promise<Article[]> {
  const openai = getOpenAI()
  
  if (!openai || articles.length === 0) {
    return articles
  }
  
  const concurrency = options.concurrency || 3 // Lower concurrency when fetching content
  const results: Article[] = []
  
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency)
    const summaries = await Promise.all(
      batch.map(article => summarizeArticle(article, options))
    )
    
    batch.forEach((article, index) => {
      const result = summaries[index]
      results.push({
        ...article,
        summary: result?.summary || undefined,
        summarySource: result?.source || undefined,
      })
    })
  }
  
  return results
}

/**
 * Generate a simple string summary (backwards compatible)
 */
export async function summarizeArticleSimple(article: Article): Promise<string | null> {
  const result = await summarizeArticle(article, { fetchContent: false, fetchComments: false })
  if (!result) return null
  
  const { summary } = result
  return `${summary.what} ${summary.whyItMatters}${summary.keyDetail ? ` ${summary.keyDetail}` : ''}`
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * Format structured summary for display
 */
export function formatSummary(summary: string | StructuredSummary): string {
  if (typeof summary === 'string') {
    return summary
  }
  
  let text = summary.what
  if (summary.whyItMatters) {
    text += ` ${summary.whyItMatters}`
  }
  if (summary.keyDetail) {
    text += ` ${summary.keyDetail}`
  }
  return text
}
