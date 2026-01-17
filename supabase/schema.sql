-- TechPulse Database Schema
-- Run this in Supabase SQL Editor to create the required tables

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  points INTEGER,
  comment_count INTEGER,
  hn_url TEXT,
  tags TEXT[] DEFAULT '{}',
  summary JSONB,
  summary_source TEXT,
  hotness_score FLOAT DEFAULT 0,
  content_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search vector (auto-generated)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary->>'what', '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary->>'whyItMatters', '')), 'C')
  ) STORED
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_external ON articles(source, external_id);
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_hotness ON articles(hotness_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);

-- Ingest runs tracking table
CREATE TABLE IF NOT EXISTS ingest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  fetched_count INTEGER DEFAULT 0,
  inserted_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_started ON ingest_runs(started_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_articles_updated_at ON articles;
CREATE TRIGGER trigger_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) - Enable public read access
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to articles"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role full access to articles"
  ON articles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ingest runs - service role only
ALTER TABLE ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to ingest_runs"
  ON ingest_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

