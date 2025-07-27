import { createBrowserClient } from '@supabase/ssr'
import { config, validateConfig } from '@/lib/config'

export function createClient() {
  // Validate config before creating client
  if (!validateConfig()) {
    console.error('Invalid Supabase configuration. Please check your environment variables.')
  }
  
  // Check if we're on a Microsoft OAuth callback page
  const isMicrosoftCallback = typeof window !== 'undefined' && 
    window.location.pathname === '/auth/callback/microsoft'
  
  return createBrowserClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        detectSessionInUrl: !isMicrosoftCallback, // Disable for Microsoft OAuth
        flowType: 'pkce',
        debug: false
      }
    }
  )
}