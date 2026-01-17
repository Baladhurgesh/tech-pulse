// Supabase database types

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string
          source: string
          external_id: string
          url: string
          title: string
          author: string | null
          published_at: string
          fetched_at: string
          points: number | null
          comment_count: number | null
          hn_url: string | null
          tags: string[]
          summary: {
            what: string
            whyItMatters: string
            keyDetail?: string
          } | null
          summary_source: string | null
          hotness_score: number
          content_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          source: string
          external_id: string
          url: string
          title: string
          author?: string | null
          published_at: string
          fetched_at?: string
          points?: number | null
          comment_count?: number | null
          hn_url?: string | null
          tags?: string[]
          summary?: {
            what: string
            whyItMatters: string
            keyDetail?: string
          } | null
          summary_source?: string | null
          hotness_score?: number
          content_text?: string | null
        }
        Update: {
          id?: string
          source?: string
          external_id?: string
          url?: string
          title?: string
          author?: string | null
          published_at?: string
          fetched_at?: string
          points?: number | null
          comment_count?: number | null
          hn_url?: string | null
          tags?: string[]
          summary?: {
            what: string
            whyItMatters: string
            keyDetail?: string
          } | null
          summary_source?: string | null
          hotness_score?: number
          content_text?: string | null
          updated_at?: string
        }
      }
      ingest_runs: {
        Row: {
          id: string
          started_at: string
          completed_at: string | null
          status: 'running' | 'completed' | 'failed'
          fetched_count: number
          inserted_count: number
          updated_count: number
          error_count: number
          error_message: string | null
        }
        Insert: {
          id?: string
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          fetched_count?: number
          inserted_count?: number
          updated_count?: number
          error_count?: number
          error_message?: string | null
        }
        Update: {
          completed_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          fetched_count?: number
          inserted_count?: number
          updated_count?: number
          error_count?: number
          error_message?: string | null
        }
      }
    }
    Functions: {
      search_articles: {
        Args: {
          search_query: string
          tag_filter?: string[]
          from_date?: string
          to_date?: string
          sort_by?: string
          limit_count?: number
          offset_count?: number
        }
        Returns: Database['public']['Tables']['articles']['Row'][]
      }
    }
  }
}

// Helper type for article row
export type ArticleRow = Database['public']['Tables']['articles']['Row']
export type ArticleInsert = Database['public']['Tables']['articles']['Insert']
export type ArticleUpdate = Database['public']['Tables']['articles']['Update']

