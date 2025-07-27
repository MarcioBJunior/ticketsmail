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
    const { status, priority } = await request.json()
    
    if (!status && !priority) {
      return NextResponse.json({ error: 'Status or priority is required' }, { status: 400 })
    }
    
    // Get current ticket state
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('status, priority')
      .eq('id', params.id)
      .single()
    
    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    
    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }
    
    if (status && status !== currentTicket.status) {
      updates.status = status
      
      // Auto-set closed_at when closing ticket
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString()
      } else if (currentTicket.status === 'closed' && status !== 'closed') {
        updates.closed_at = null
      }
    }
    
    if (priority && priority !== currentTicket.priority) {
      updates.priority = priority
    }
    
    // Update ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating ticket:', error)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }
    
    // Create audit log
    const changes: any = {}
    if (status && status !== currentTicket.status) {
      changes.status = { from: currentTicket.status, to: status }
    }
    if (priority && priority !== currentTicket.priority) {
      changes.priority = { from: currentTicket.priority, to: priority }
    }
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ticket_status_updated',
        entity_type: 'ticket',
        entity_id: ticket.id,
        changes
      })
    
    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket atualizado com sucesso'
    })
    
  } catch (error: any) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}