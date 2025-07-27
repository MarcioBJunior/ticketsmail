// Centralized configuration with validation
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  microsoft: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  }
}

// Validate required environment variables
export function validateConfig() {
  const required = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: config.supabase.url },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: config.supabase.anonKey },
  ]

  const missing = required.filter(({ value }) => !value)
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.map(m => m.key))
    return false
  }
  
  // Validate URL format
  try {
    new URL(config.supabase.url)
  } catch (e) {
    console.error('Invalid NEXT_PUBLIC_SUPABASE_URL format:', config.supabase.url)
    return false
  }
  
  return true
}

