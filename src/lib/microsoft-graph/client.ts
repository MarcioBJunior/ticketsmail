import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { ClientSecretCredential } from '@azure/identity'

// Microsoft Graph configuration
export interface MicrosoftGraphConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
}

// Get config from environment variables
export function getMicrosoftGraphConfig(): MicrosoftGraphConfig {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const redirectUri = process.env.NEXT_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_URL}/auth/microsoft/callback`
    : 'http://localhost:3001/auth/microsoft/callback'

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing Microsoft Graph configuration')
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri
  }
}

// Create Microsoft Graph client for app-only authentication
export function createAppGraphClient(config: MicrosoftGraphConfig): Client {
  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  })

  return Client.initWithMiddleware({
    authProvider
  })
}

// Create Microsoft Graph client for delegated authentication
export function createUserGraphClient(accessToken: string): Client {
  // Validate token format
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Invalid access token provided')
  }
  
  // Microsoft can return either JWT tokens (3 parts) or opaque tokens (1 part)
  // Both are valid for Graph API calls
  const tokenParts = accessToken.split('.')
  
  console.log('Creating Graph client with token:', {
    tokenLength: accessToken.length,
    parts: tokenParts.length,
    tokenPreview: accessToken.substring(0, 30) + '...',
    isJWT: tokenParts.length === 3,
    isOpaque: tokenParts.length === 1
  })
  
  // Accept both JWT (3 parts) and opaque tokens (1 part)
  // Opaque tokens are valid access tokens from Microsoft
  if (tokenParts.length !== 3 && tokenParts.length !== 1) {
    throw new Error(`Access token has unexpected format. Token has ${tokenParts.length} parts.`)
  }
  
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    }
  })
}

// Helper to get authorization URL
export function getAuthorizationUrl(config: MicrosoftGraphConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email offline_access User.Read Mail.Read Mail.Send Mail.ReadWrite',
    state: state
  })

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  config: MicrosoftGraphConfig, 
  code: string
): Promise<any> {
  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    scope: 'openid profile email offline_access User.Read Mail.Read Mail.Send'
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for token')
  }

  return response.json()
}

// Refresh access token
export async function refreshAccessToken(
  config: MicrosoftGraphConfig,
  refreshToken: string
): Promise<any> {
  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'openid profile email offline_access User.Read Mail.Read Mail.Send'
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  return response.json()
}