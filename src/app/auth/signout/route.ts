import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Redirect to login page
  return NextResponse.redirect(new URL('/login', request.url))
}