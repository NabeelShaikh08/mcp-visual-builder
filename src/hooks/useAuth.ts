'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const supabase = createClient()

  const loading = authState === 'loading'

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setUser(null)
        setAuthState('unauthenticated')
      } else {
        setUser(data.user)
        setAuthState('authenticated')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      setAuthState(u ? 'authenticated' : 'unauthenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    // Clear encrypted credentials and encryption key so they don't persist for the next user
    localStorage.removeItem('mcp-builder-credentials-v2')
    localStorage.removeItem('mcp-builder-salt')
    window.location.href = '/'
  }

  return { user, loading, authState, signInWithGoogle, signOut }
}
