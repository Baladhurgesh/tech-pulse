# TechPulse 🚀

> A beautiful, AI-powered tech news aggregator that surfaces the hottest stories from Hacker News with structured summaries, full-text search, and persistent storage.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?style=flat&logo=supabase)

## ✨ Features

### Core Features
- 📰 **Real-time news** from Hacker News API
- 🤖 **Structured AI summaries** (What / Why it matters / Key detail)
- 🔥 **Hotness scoring** algorithm with sort options (Hot / New / Most Discussed)
- 🔍 **Full-text search** with tag filtering
- 🏷️ **Smart tagging** (topic + company tags auto-detected)
- 🗄️ **Supabase database** - all articles stored persistently
- 📱 **Fully responsive** design with dark hacker aesthetic

### Advanced Features
- 📊 **Article detail drawer** with full summary, related stories
- ⏰ **Cron job** - automatically fetches and summarizes news every 10 minutes
- 🔄 **Duplicate prevention** - upserts handle existing articles gracefully
- 📅 **Time range filters** (24h / 7d / 30d / All)
- 🔗 **Content extraction** for better summaries

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (for AI summaries)
- Supabase account (optional, for persistence)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tech-news-summarizer.git
cd tech-news-summarizer

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local and add your keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file:

```env
# Required for AI summaries
OPENAI_API_KEY=sk-your-api-key-here

# Supabase (Optional - enables persistence and search)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron Secret (for scheduled ingestion)
CRON_SECRET=your-cron-secret-here

# GitHub Repository URL (shown in header)
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-username/news-summarizer

# Optional settings
CACHE_TTL_MINUTES=10
TOP_STORIES_COUNT=30
```

> **Note:** The app works without Supabase—it will use in-memory caching instead.

### Supabase Setup (Optional)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your API keys to `.env.local`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TechPulse App                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────┐              ┌──────────────────────────────┐  │
│  │   React UI     │◀────────────▶│  API Routes                  │  │
│  │   (Next.js)    │              │  /api/news - read from DB    │  │
│  │                │              │  /api/search - full-text     │  │
│  │  Components:   │              │  /api/ingest - cron job      │  │
│  │  - NewsCard    │              └──────────────┬───────────────┘  │
│  │  - SearchBar   │                             │                  │
│  │  - SortControls│                             ▼                  │
│  │  - ArticleDrawer│          ┌─────────────────────────────────┐  │
│  └────────────────┘           │       Supabase (Postgres)       │  │
│                               │  - articles table               │  │
│                               │  - Full-text search index       │  │
│                               │  - ingest_runs tracking         │  │
│                               └─────────────────────────────────┘  │
│                                             ▲                      │
│                    ┌────────────────────────┴────────────────────┐ │
│                    │          Cron Job (Every 10 min)            │ │
│                    │  1. Fetch from HackerNews API               │ │
│                    │  2. Upsert to DB (skip duplicates)          │ │
│                    │  3. Generate AI summaries for new articles  │ │
│                    └────────────────────────────────────────────┘ │
│                                             │                      │
│                    ┌────────────────────────┼────────────────────┐ │
│                    ▼                        ▼                    │ │
│            ┌─────────────┐          ┌─────────────┐              │ │
│            │ HackerNews  │          │   OpenAI    │              │ │
│            │    API      │          │  GPT-4o-mini│              │ │
│            └─────────────┘          └─────────────┘              │ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main page with search, filters, sort controls |
| `app/api/news/route.ts` | Fetch + cache + summarize + sort |
| `app/api/search/route.ts` | Full-text search endpoint |
| `app/api/ingest/route.ts` | Background ingestion for cron |
| `lib/sources/hackernews.ts` | HackerNews API integration |
| `lib/summarize.ts` | Structured OpenAI summarization |
| `lib/content-extractor.ts` | Extract article content for better summaries |
| `lib/db/articles.ts` | Supabase database operations |
| `components/ArticleDrawer.tsx` | Detail panel with full summary |
| `components/SortControls.tsx` | Sort + time range controls |

### Structured Summaries

The AI generates structured summaries with three parts:
- **What:** One sentence describing what happened
- **Why it matters:** One sentence on significance
- **Key detail:** Notable number, quote, or claim (optional)

### Hotness Algorithm

```
Hotness = recency × (1 + engagement) × sourceWeight

Where:
- recency = e^(-ageHours / 12)     # Exponential decay
- engagement = log(1 + points + 2×comments)
- sourceWeight = 1.3 for HackerNews
```

## 🔄 Background Ingestion

The app uses Vercel Cron to automatically update the database every 10 minutes:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/ingest",
    "schedule": "*/10 * * * *"
  }]
}
```

The cron job runs every 10 minutes to:
1. Fetch latest stories from Hacker News API
2. Upsert to Supabase (duplicates are handled via `ON CONFLICT`)
3. Generate AI summaries for articles that don't have them (up to 15 per run)
4. Track run stats in `ingest_runs` table

### Manual Ingestion

You can also trigger ingestion manually:

```bash
# Trigger via curl (requires CRON_SECRET if configured)
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check ingestion status
curl http://localhost:3000/api/ingest
```

## 🎨 Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **Structured summaries** | More scannable than paragraphs, shows what/why/detail |
| **Content extraction** | Better summaries by fetching real article text |
| **Supabase optional** | Works without DB (in-memory mode) for easy local dev |
| **Clickable tags** | Quick filtering by topic or company |
| **Time range controls** | Surface old but relevant stories |
| **Detail drawer** | Rich view without leaving the page |

## 🤖 AI Tools Used

| Tool | Usage |
|------|-------|
| **Claude (Anthropic)** | Architecture, code generation, planning |
| **OpenAI GPT-4o-mini** | Runtime article summarization |

## 📦 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Supabase](https://supabase.com/) (Postgres)
- **Icons:** [Lucide React](https://lucide.dev/)
- **AI:** [OpenAI API](https://openai.com/)
- **Data Source:** [Hacker News API](https://github.com/HackerNews/API)

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/tech-news-summarizer&env=OPENAI_API_KEY,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,CRON_SECRET)

1. Click the button above
2. Add your environment variables
3. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## 📝 What's Next

Future improvements with more time:
1. **Semantic search** — pgvector embeddings for "find similar stories"
2. **Multi-source ingestion** — Add RSS feeds, Reddit, Product Hunt
3. **User accounts** — Save favorites, custom feeds
4. **Daily digest** — Email summary of top stories
5. **Push notifications** — Breaking news alerts

## 📝 License

MIT © 2026

---

**Built with ☕ and AI assistance**
