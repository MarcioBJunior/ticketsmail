import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Clear the invalid tokens
    const { error } = await supabase
      .from('email_accounts')
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null
      })
      .eq('id', params.accountId)
      .eq('user_id', user.id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tokens cleared. Please reconnect the account.',
      accountId: params.accountId
    })
    
  } catch (error: any) {
    console.error('Reconnect error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}