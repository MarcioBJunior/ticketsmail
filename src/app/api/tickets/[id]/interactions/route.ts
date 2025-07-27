import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Validate required fields
    if (!body.type || !body.content) {
      return NextResponse.json({ 
        error: 'Missing required fields: type and content' 
      }, { status: 400 })
    }

    // Create interaction
    const { data: interaction, error } = await supabase
      .from('ticket_interactions')
      .insert({
        ticket_id: params.id,
        type: body.type,
        content: body.content,
        user_id: user.id,
        ...(body.type === 'email_reply' && {
          from_email: body.from_email || user.email,
          from_name: body.from_name || user.user_metadata?.name || user.email
        })
      })
      .select(`
        *,
        users(name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update ticket's updated_at
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id)

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'interaction_created',
      entity_type: 'ticket_interaction',
      entity_id: interaction.id,
      details: {
        ticket_id: params.id,
        type: body.type
      }
    })

    return NextResponse.json({ 
      success: true, 
      interaction 
    })

  } catch (error) {
    console.error('Error creating interaction:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get interactions for the ticket
    const { data: interactions, error } = await supabase
      .from('ticket_interactions')
      .select(`
        *,
        users(name, email)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      interactions 
    })

  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}