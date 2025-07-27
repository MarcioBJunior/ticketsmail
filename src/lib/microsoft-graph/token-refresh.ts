import { createClient } from '@/lib/supabase/server'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

export async function refreshMicrosoftToken(refreshToken: string) {
  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/.default offline_access'
  })
  
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }
  
  const tokens = await response.json()
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || refreshToken,
    expires_in: tokens.expires_in
  }
}

export async function getValidAccessToken(emailAccountId: string) {
  const supabase = await createClient()
  
  // Get email account
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', emailAccountId)
    .single()
  
  if (error || !account) {
    throw new Error('Email account not found')
  }
  
  
  // Check if token is expired or about to expire (5 minutes buffer)
  const now = new Date()
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)
  
  if (!needsRefresh && account.access_token) {
    return account.access_token
  }
  
  // Refresh token
  if (!account.refresh_token) {
    throw new Error('No refresh token available')
  }
  
  try {
    const newTokens = await refreshMicrosoftToken(account.refresh_token)
    
    // Update tokens in database
    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000)
    await supabase
      .from('email_accounts')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: expiresAt.toISOString()
      })
      .eq('id', emailAccountId)
    
    return newTokens.access_token
  } catch (error) {
    throw error
  }
}