/**
 * Content extraction utilities for fetching article text
 */

interface ExtractedContent {
  title?: string
  description?: string
  content?: string
  image?: string
}

/**
 * Extract content from a URL using OpenGraph metadata and basic HTML parsing
 */
export async function extractContent(url: string): Promise<ExtractedContent | null> {
  try {
    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TechPulse/1.0 (News Aggregator)',
        'Accept': 'text/html',
      },
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      return null
    }
    
    const html = await response.text()
    return parseHTML(html)
  } catch (error) {
    // Silently fail - content extraction is optional
    console.log(`[content-extractor] Failed to fetch ${url}:`, error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Parse HTML to extract OpenGraph metadata and content
 */
function parseHTML(html: string): ExtractedContent {
  const result: ExtractedContent = {}
  
  // Extract OpenGraph metadata
  const ogTitle = extractMeta(html, 'og:title')
  const ogDescription = extractMeta(html, 'og:description')
  const ogImage = extractMeta(html, 'og:image')
  
  // Fallback to regular meta tags
  const metaDescription = extractMeta(html, 'description')
  const twitterDescription = extractMeta(html, 'twitter:description')
  
  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : undefined
  
  result.title = ogTitle || pageTitle
  result.description = ogDescription || twitterDescription || metaDescription
  result.image = ogImage
  
  // Try to extract main content (simplified)
  result.content = extractMainContent(html)
  
  return result
}

/**
 * Extract meta tag content
 */
function extractMeta(html: string, name: string): string | undefined {
  // Try property attribute (OpenGraph)
  const propertyMatch = html.match(new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
  if (propertyMatch) return decodeHTMLEntities(propertyMatch[1])
  
  // Try name attribute (standard meta)
  const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
  if (nameMatch) return decodeHTMLEntities(nameMatch[1])
  
  // Try content first format
  const contentFirstMatch = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))
  if (contentFirstMatch) return decodeHTMLEntities(contentFirstMatch[1])
  
  return undefined
}

/**
 * Extract main content from HTML (simplified version)
 */
function extractMainContent(html: string): string | undefined {
  // Remove scripts, styles, and other non-content
  let content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
  
  // Try to find article or main content
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  
  const targetContent = articleMatch?.[1] || mainMatch?.[1] || content
  
  // Extract text from paragraphs
  const paragraphs: string[] = []
  const pMatches = targetContent.matchAll(/<p[^>]*>([^<]+(?:<[^>]+>[^<]*)*)<\/p>/gi)
  
  for (const match of pMatches) {
    const text = stripTags(match[1]).trim()
    if (text.length > 50) { // Only meaningful paragraphs
      paragraphs.push(text)
    }
  }
  
  if (paragraphs.length > 0) {
    // Return first few paragraphs (max ~1000 chars)
    let result = ''
    for (const p of paragraphs) {
      if (result.length + p.length > 1000) break
      result += p + ' '
    }
    return result.trim()
  }
  
  return undefined
}

/**
 * Strip HTML tags from text
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Fetch top HN comments for context
 */
export async function fetchHNComments(storyId: number, limit = 3): Promise<string[]> {
  try {
    // Fetch story to get comment IDs
    const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)
    if (!storyRes.ok) return []
    
    const story = await storyRes.json()
    const commentIds = story.kids?.slice(0, limit) || []
    
    // Fetch comments in parallel
    const comments = await Promise.all(
      commentIds.map(async (id: number) => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          if (!res.ok) return null
          const comment = await res.json()
          if (comment?.text) {
            return stripTags(comment.text).slice(0, 300)
          }
          return null
        } catch {
          return null
        }
      })
    )
    
    return comments.filter((c): c is string => c !== null)
  } catch {
    return []
  }
}

