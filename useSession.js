import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Tracks the Supabase auth session.
//   undefined -> still checking for a stored session
//   null      -> signed out
//   object    -> signed in
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ?? null) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => { if (alive) setSession(s ?? null) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  return session
}
