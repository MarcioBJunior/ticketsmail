import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from '@/lib/rate-limit'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MICROSOFT_USER_URL = 'https://graph.microsoft.com/v1.0/me'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.auth(request)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
    // Use the exact same redirect URI as configured in Azure
    const redirectUri = `http://localhost:3001/auth/callback/microsoft`
    

    // Exchange code for tokens
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    
    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      
      return NextResponse.json(
        { 
          error: errorData.error || 'Failed to exchange authorization code',
          error_description: errorData.error_description || errorText,
          details: {
            status: tokenResponse.status,
            clientId,
            redirectUri
          }
        },
        { status: 400 }
      )
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch(MICROSOFT_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user information' },
        { status: 400 }
      )
    }

    const userInfo = await userResponse.json()

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email: userInfo.mail || userInfo.userPrincipalName,
      name: userInfo.displayName,
      expires_in: tokens.expires_in
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}