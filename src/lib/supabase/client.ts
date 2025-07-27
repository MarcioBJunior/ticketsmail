import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Check if we're on a Microsoft OAuth callback page
  const isMicrosoftCallback = typeof window !== 'undefined' && 
    window.location.pathname === '/auth/callback/microsoft'
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: !isMicrosoftCallback, // Disable for Microsoft OAuth
        flowType: 'pkce',
        debug: false
      }
    }
  )
}