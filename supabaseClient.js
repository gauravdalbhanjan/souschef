import { createClient } from '@supabase/supabase-js'

// Both values are PUBLIC by design (the publishable/anon key is meant to ship in
// the browser). Row Level Security in Postgres is what protects user data.
// Override per-environment with Vercel env vars VITE_SUPABASE_URL / _ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

// createClient throws on an empty URL, so use inert placeholders when unset and
// let the UI show a clear "not configured" message instead of a blank screen.
export const supabase = createClient(url || 'http://localhost:54321', key || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
