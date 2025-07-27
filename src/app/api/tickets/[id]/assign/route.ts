import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get request body
    const { assignedTo } = await request.json()
    
    // Validate assignedTo is either null or a valid user ID
    if (assignedTo !== null) {
      const { data: assignedUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', assignedTo)
        .single()
      
      if (!assignedUser) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
    }
    
    // Update ticket assignment
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update({ 
        assigned_to: assignedTo,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        assigned_user:users!assigned_to(id, name, email)
      `)
      .single()
    
    if (error) {
      console.error('Error updating ticket:', error)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    
    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: assignedTo ? 'ticket_assigned' : 'ticket_unassigned',
        entity_type: 'ticket',
        entity_id: ticket.id,
        changes: {
          assigned_to: assignedTo,
          previous_assigned_to: ticket.assigned_to
        }
      })
    
    return NextResponse.json({
      success: true,
      ticket,
      message: assignedTo 
        ? `Ticket atribuído para ${ticket.assigned_user?.name}` 
        : 'Atribuição removida'
    })
    
  } catch (error: any) {
    console.error('Assign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}