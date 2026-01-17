import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance - using 'any' for flexibility with our manual schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: SupabaseClient<any> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: SupabaseClient<any> | null = null

/**
 * Get the publishable key (supports both old and new Supabase key formats)
 */
function getPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

/**
 * Get Supabase client for client-side operations (uses publishable/anon key)
 * Safe to use in browser
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = getPublishableKey()
  
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }
  
  return supabaseClient
}

/**
 * Get Supabase admin client for server-side operations
 * Uses service role key if available, otherwise falls back to publishable key
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key, fall back to publishable key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getPublishableKey()
  
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  
  return supabaseAdmin
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    getPublishableKey()
  )
}

