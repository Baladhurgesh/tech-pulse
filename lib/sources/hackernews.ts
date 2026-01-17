import { Article, HNStory } from '@/types/news'
import { computeHotness } from '@/lib/hotness'

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0'
const DEFAULT_STORY_COUNT = 30

/**
 * Fetch top stories from Hacker News
 */
export async function fetchHackerNews(): Promise<Article[]> {
  const storyCount = parseInt(process.env.TOP_STORIES_COUNT || '', 10) || DEFAULT_STORY_COUNT
  
  // 1. Get top story IDs
  const topStoriesRes = await fetch(`${HN_API_BASE}/topstories.json`, {
    next: { revalidate: 300 } // Cache for 5 min at CDN level
  })
  
  if (!topStoriesRes.ok) {
    throw new Error(`Failed to fetch top stories: ${topStoriesRes.status}`)
  }
  
  const storyIds: number[] = await topStoriesRes.json()
  const topIds = storyIds.slice(0, storyCount)
  
  // 2. Fetch story details in parallel (with concurrency limit)
  const stories = await fetchStoriesInBatches(topIds, 10)
  
  // 3. Filter and transform to Article format
  const articles: Article[] = stories
    .filter((story): story is HNStory => {
      // Only include stories with URLs (skip Ask HN, Show HN text posts)
      return story !== null && story.url !== undefined
    })
    .map((story) => {
      const article: Article = {
        id: `hn-${story.id}`,
        source: 'hackernews',
        externalId: String(story.id),
        url: story.url!,
        title: story.title,
        author: story.by,
        publishedAt: new Date(story.time * 1000),
        fetchedAt: new Date(),
        tags: detectTags(story.title, story.url),
        points: story.score,
        commentCount: story.descendants || 0,
        hnUrl: `https://news.ycombinator.com/item?id=${story.id}`,
        hotnessScore: 0, // Will be computed below
      }
      
      article.hotnessScore = computeHotness(article)
      return article
    })
  
  // 4. Sort by hotness
  articles.sort((a, b) => b.hotnessScore - a.hotnessScore)
  
  return articles
}

/**
 * Fetch stories in batches to avoid overwhelming the API
 */
async function fetchStoriesInBatches(
  ids: number[],
  batchSize: number
): Promise<(HNStory | null)[]> {
  const results: (HNStory | null)[] = []
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        try {
          const res = await fetch(`${HN_API_BASE}/item/${id}.json`)
          if (!res.ok) return null
          return res.json() as Promise<HNStory>
        } catch {
          return null
        }
      })
    )
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Keyword-based tag detection with fallback
 */
function detectTags(title: string, url?: string): string[] {
  const tags: string[] = []
  const lowerTitle = title.toLowerCase()
  const lowerUrl = (url || '').toLowerCase()
  
  // Topic-based tags (expanded keywords for better coverage)
  const topicPatterns: Record<string, string[]> = {
    'AI': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'gpt', 'llm', 'chatgpt', 'claude', 'neural', 'deep learning', 'transformer', 'diffusion', 'model', 'inference', 'training', 'agent', 'embedding'],
    'Security': ['security', 'hack', 'breach', 'vulnerability', 'cve', 'ransomware', 'malware', 'privacy', 'encryption', 'zero-day', 'exploit', 'attack', 'phishing', 'password', 'auth', 'ssl', 'tls'],
    'Cloud': ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'k8s', 'docker', 'serverless', 'lambda', 'container', 'devops', 'infrastructure', 'deploy'],
    'Web': ['javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'deno', 'bun', 'nextjs', 'web', 'browser', 'html', 'css', 'frontend', 'dom', 'http', 'api', 'rest', 'graphql'],
    'Mobile': ['ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'mobile', 'iphone', 'ipad', 'app store', 'play store'],
    'Data': ['database', 'sql', 'postgres', 'mongodb', 'redis', 'data', 'analytics', 'warehouse', 'etl', 'pipeline', 'spark', 'kafka'],
    'Startup': ['startup', 'funding', 'vc', 'yc', 'raised', 'series a', 'series b', 'acquisition', 'unicorn', 'founder', 'pivot', 'launch'],
    'Open Source': ['open source', 'open-source', 'github', 'gitlab', 'oss', 'mit license', 'apache', 'foss', 'contributor', 'repository', 'repo'],
    'Programming': ['rust', 'golang', 'python', 'java', 'c++', 'programming', 'compiler', 'language', 'code', 'developer', 'engineering', 'algorithm', 'debug', 'syntax'],
    'Hardware': ['chip', 'cpu', 'gpu', 'nvidia', 'amd', 'intel', 'semiconductor', 'silicon', 'quantum', 'processor', 'memory', 'ram', 'ssd'],
    'Crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'web3', 'nft', 'defi', 'wallet', 'token'],
    'Science': ['research', 'study', 'scientist', 'physics', 'biology', 'chemistry', 'experiment', 'discovery', 'paper', 'journal'],
    'Business': ['ceo', 'company', 'revenue', 'profit', 'market', 'stock', 'ipo', 'layoff', 'hire', 'employee', 'enterprise'],
    'Gaming': ['game', 'gaming', 'steam', 'playstation', 'nintendo', 'xbox', 'esports', 'unity', 'unreal'],
    'Career': ['interview', 'job', 'hiring', 'resume', 'salary', 'remote', 'work from home', 'career'],
  }
  
  // Company-based tags
  const companyPatterns: Record<string, string[]> = {
    'Google': ['google', 'alphabet', 'deepmind', 'waymo', 'gmail', 'chrome', 'youtube', 'gemini', 'bard'],
    'Apple': ['apple', 'iphone', 'ipad', 'macos', 'macbook', 'vision pro', 'siri', 'airpods', 'watch'],
    'Microsoft': ['microsoft', 'windows', 'azure', 'github', 'copilot', 'linkedin', 'xbox', 'bing', 'teams', 'office'],
    'Amazon': ['amazon', 'aws', 'alexa', 'kindle', 'prime', 'ec2', 's3'],
    'Meta': ['meta', 'facebook', 'instagram', 'whatsapp', 'oculus', 'threads', 'llama', 'zuckerberg'],
    'OpenAI': ['openai', 'chatgpt', 'gpt-4', 'gpt-5', 'dall-e', 'sora', 'sam altman'],
    'Anthropic': ['anthropic', 'claude'],
    'Tesla': ['tesla', 'elon musk', 'spacex', 'neuralink', 'starlink', 'cybertruck'],
    'Nvidia': ['nvidia', 'cuda', 'geforce', 'rtx', 'jensen'],
    'Netflix': ['netflix'],
    'Spotify': ['spotify'],
    'Uber': ['uber', 'lyft'],
    'Airbnb': ['airbnb'],
    'Stripe': ['stripe'],
    'Cloudflare': ['cloudflare', 'workers'],
    'Vercel': ['vercel', 'nextjs', 'next.js'],
    'X/Twitter': ['twitter', 'x.com', 'tweet'],
    'Discord': ['discord'],
    'Slack': ['slack'],
    'Reddit': ['reddit', 'subreddit'],
    'LinkedIn': ['linkedin'],
  }
  
  // Domain-based fallback tags (if URL matches)
  const domainTags: Record<string, string> = {
    'arxiv.org': 'Science',
    'nature.com': 'Science',
    'ieee.org': 'Science',
    'acm.org': 'Programming',
    'medium.com': 'Blog',
    'dev.to': 'Programming',
    'techcrunch.com': 'Startup',
    'wired.com': 'Tech',
    'arstechnica.com': 'Tech',
    'theverge.com': 'Tech',
    'bloomberg.com': 'Business',
    'reuters.com': 'News',
    'nytimes.com': 'News',
    'bbc.com': 'News',
    'theguardian.com': 'News',
  }
  
  // Detect topic tags
  for (const [tag, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      tags.push(tag)
    }
  }
  
  // Detect company tags
  for (const [tag, keywords] of Object.entries(companyPatterns)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      tags.push(tag)
    }
  }
  
  // If no tags found, try domain-based detection
  if (tags.length === 0 && url) {
    for (const [domain, tag] of Object.entries(domainTags)) {
      if (lowerUrl.includes(domain)) {
        tags.push(tag)
        break
      }
    }
  }
  
  // Final fallback: always add "Tech" if still no tags (it's HN after all)
  if (tags.length === 0) {
    tags.push('Tech')
  }
  
  // Limit to 4 tags
  return tags.slice(0, 4)
}

/**
 * Get a single story by ID (for detail pages)
 */
export async function fetchStoryById(id: number): Promise<HNStory | null> {
  try {
    const res = await fetch(`${HN_API_BASE}/item/${id}.json`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

