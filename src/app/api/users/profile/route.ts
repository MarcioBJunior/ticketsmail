import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Check if user profile exists
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email!.split('@')[0],
          role: 'collaborator'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating user profile:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          details: createError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({ profile: newProfile, created: true })
    }
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    
    return NextResponse.json({ profile, created: false })
    
  } catch (error: any) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}