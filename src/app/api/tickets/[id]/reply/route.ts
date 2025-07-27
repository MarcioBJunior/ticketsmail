import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MicrosoftEmailService } from '@/lib/microsoft-graph/email-service'
import { getValidAccessToken } from '@/lib/microsoft-graph/token-refresh'

export async function POST(
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
    
    // Check if user exists in users table
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (userError || !dbUser) {
      console.error('User not found in users table:', userError)
      return NextResponse.json({ 
        error: 'User profile not found',
        details: 'User needs to be registered in the system'
      }, { status: 403 })
    }
    
    // Get request body
    const { content, type = 'reply' } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    
    // Get ticket with email account info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        email_accounts(*)
      `)
      .eq('id', params.id)
      .single()
    
    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    
    // Create interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from('ticket_interactions')
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content,
        type: type === 'reply' ? 'email_reply' : 'comment',
        is_internal: type === 'comment'
      })
      .select()
      .single()
    
    if (interactionError) {
      console.error('Error creating interaction:', interactionError)
      return NextResponse.json({ 
        error: 'Failed to create interaction',
        details: interactionError.message,
        code: interactionError.code
      }, { status: 500 })
    }
    
    // If it's a reply (not internal comment), send email
    if (type === 'reply' && ticket.email_message_id && ticket.email_account_id) {
      try {
        console.log('Attempting to send email reply:', {
          ticketId: ticket.id,
          emailMessageId: ticket.email_message_id,
          emailAccountId: ticket.email_account_id,
          toEmail: ticket.from_email
        })
        
        // Get valid access token (refreshes if needed)
        const accessToken = await getValidAccessToken(ticket.email_account_id)
        const emailService = new MicrosoftEmailService(accessToken)
        
        // Format reply content with signature
        const replyContent = `${content}

---
${user.email}
Sistema de Tickets`
        
        // Send reply
        await emailService.sendReply(ticket.email_message_id, replyContent)
        
        // Update ticket status if needed
        if (ticket.status === 'new' || ticket.status === 'waiting_response') {
          await supabase
            .from('tickets')
            .update({ 
              status: 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', ticket.id)
        }
        
        return NextResponse.json({
          success: true,
          interaction,
          emailSent: true,
          message: 'Resposta enviada por email'
        })
      } catch (emailError: any) {
        
        // Update interaction to mark email failed
        await supabase
          .from('ticket_interactions')
          .update({ 
            metadata: { 
              emailError: emailError.message,
              emailFailed: true,
              errorDetails: {
                statusCode: emailError.statusCode,
                code: emailError.code,
                timestamp: new Date().toISOString()
              }
            }
          })
          .eq('id', interaction.id)
        
        // Provide more specific error messages
        let warningMessage = 'Interação salva, mas o email não pôde ser enviado'
        if (emailError.statusCode === 401 || emailError.code === 'InvalidAuthenticationToken') {
          warningMessage += '. Token de acesso expirado - reconecte a conta de email.'
        } else if (emailError.statusCode === 404) {
          warningMessage += '. Mensagem original não encontrada.'
        }
        
        return NextResponse.json({
          success: true,
          interaction,
          emailSent: false,
          warning: warningMessage,
          errorDetails: {
            message: emailError.message,
            statusCode: emailError.statusCode
          }
        })
      }
    }
    
    // For internal comments or when email is disabled
    return NextResponse.json({
      success: true,
      interaction,
      emailSent: false,
      message: type === 'reply' 
        ? 'Resposta registrada (envio de email temporariamente desabilitado)'
        : 'Comentário interno adicionado'
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}