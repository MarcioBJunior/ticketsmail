import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MicrosoftEmailService } from '@/lib/microsoft-graph/email-service'
import { getValidAccessToken } from '@/lib/microsoft-graph/token-refresh'

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
    
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', params.accountId)
      .eq('user_id', user.id)
      .single()
    
    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }
    
    // Get valid access token (refreshes if needed)
    let accessToken: string
    try {
      accessToken = await getValidAccessToken(params.accountId)
    } catch (tokenError: any) {
      console.error('Token refresh error:', tokenError)
      return NextResponse.json(
        { 
          error: 'Failed to get valid access token',
          details: tokenError.message,
          hint: 'You may need to reconnect your email account'
        },
        { status: 401 }
      )
    }
    
    // Initialize email service
    const emailService = new MicrosoftEmailService(accessToken)
    
    // Get emails from the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // Try without folder filtering first
    const emails = await emailService.getEmails({
      startDate: sevenDaysAgo
    })
    
    // Process each email
    let created = 0
    let updated = 0
    let errors = 0
    
    for (const email of emails) {
      try {
        // Check if ticket already exists for this email
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('id')
          .eq('email_message_id', email.id)
          .single()
        
        if (existingTicket) {
          // Update existing ticket if needed
          const { error: updateError } = await supabase
            .from('tickets')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTicket.id)
          
          if (updateError) {
            console.error('Error updating ticket:', updateError)
            errors++
          } else {
            updated++
          }
        } else {
          // Generate ticket number
          const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
          
          // Create new ticket with correct field names
          const { error: insertError } = await supabase
            .from('tickets')
            .insert({
              ticket_number: ticketNumber,
              email_account_id: account.id,
              email_message_id: email.id,
              subject: email.subject || 'Sem assunto',
              description: email.bodyPreview || email.body?.content || '',
              from_email: email.from?.emailAddress?.address || 'unknown',
              from_name: email.from?.emailAddress?.name || null,
              status: 'new',
              priority: 'medium',
              metadata: {
                email_received_at: email.receivedDateTime,
                email_categories: email.categories,
                email_importance: email.importance,
                has_attachments: email.hasAttachments || false
              },
              attachment_count: email.hasAttachments ? 1 : 0
            })
          
          if (insertError) {
            console.error('Error creating ticket:', insertError)
            errors++
          } else {
            created++
          }
        }
      } catch (error) {
        console.error('Error processing email:', error)
        errors++
      }
    }
    
    // Update last sync timestamp
    await supabase
      .from('email_accounts')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', params.accountId)
    
    return NextResponse.json({
      success: true,
      summary: {
        total: emails.length,
        created,
        updated,
        errors
      },
      message: `Sincronização concluída: ${created} tickets criados, ${updated} atualizados`
    })
    
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao sincronizar emails',
        details: error.response?.data || error
      },
      { status: 500 }
    )
  }
}