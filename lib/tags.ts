// Shared tag configuration for consistent styling across components

export const TAG_STYLES: Record<string, string> = {
  // Topic tags
  'AI': 'tag-ai',
  'Security': 'tag-security',
  'Cloud': 'tag-cloud',
  'Startup': 'tag-startup',
  'Web': 'tag-web',
  'Programming': 'tag-programming',
  'Data': 'tag-data',
  'Mobile': 'tag-mobile',
  'Open Source': 'tag-opensource',
  'Hardware': 'tag-hardware',
  'Crypto': 'tag-crypto',
  'Science': 'tag-science',
  'Business': 'tag-business',
  'Gaming': 'tag-gaming',
  'Career': 'tag-career',
  'Blog': 'tag-blog',
  'News': 'tag-news',
  'Tech': 'tag-tech',
  // Company tags
  'Google': 'tag-google',
  'Apple': 'tag-apple',
  'Microsoft': 'tag-microsoft',
  'Amazon': 'tag-amazon',
  'Meta': 'tag-meta',
  'OpenAI': 'tag-openai',
  'Anthropic': 'tag-anthropic',
  'Tesla': 'tag-tesla',
  'Nvidia': 'tag-nvidia',
  'Netflix': 'tag-netflix',
  'Spotify': 'tag-company',
  'Uber': 'tag-company',
  'Airbnb': 'tag-company',
  'Stripe': 'tag-stripe',
  'Cloudflare': 'tag-cloudflare',
  'Vercel': 'tag-vercel',
  'X/Twitter': 'tag-twitter',
  'Discord': 'tag-company',
  'Slack': 'tag-company',
  'Reddit': 'tag-company',
  'LinkedIn': 'tag-microsoft',
}

export function getTagStyle(tag: string): string {
  return TAG_STYLES[tag] || 'tag-tech'
}

// Check if a tag is a company tag
export function isCompanyTag(tag: string): boolean {
  const companyTags = [
    'Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'OpenAI', 'Anthropic',
    'Tesla', 'Nvidia', 'Netflix', 'Spotify', 'Uber', 'Airbnb', 'Stripe',
    'Cloudflare', 'Vercel', 'X/Twitter', 'Discord', 'Slack', 'Reddit', 'LinkedIn'
  ]
  return companyTags.includes(tag)
}

