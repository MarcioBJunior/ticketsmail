import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MicrosoftEmailService } from '@/lib/microsoft-graph/email-service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { accountId } = body

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get email account
    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
    }

    if (!emailAccount.access_token) {
      return NextResponse.json({ error: 'No access token available' }, { status: 400 })
    }

    // Check if token needs refresh
    if (emailAccount.token_expires_at && new Date(emailAccount.token_expires_at) < new Date()) {
      // TODO: Implement token refresh
      return NextResponse.json({ error: 'Access token expired' }, { status: 401 })
    }

    // Initialize email service
    const emailService = new MicrosoftEmailService(emailAccount.access_token)

    // Get emails with filters
    const filter = {
      folders: emailAccount.folders_to_watch || ['Inbox'],
      senders: emailAccount.sender_filters || [],
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    }

    const emails = await emailService.getEmails(filter)

    // Process emails and create tickets
    let created = 0
    let skipped = 0

    for (const email of emails) {
      // Check if ticket already exists for this email
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id')
        .eq('email_message_id', email.id)
        .single()

      if (existingTicket) {
        skipped++
        continue
      }

      // Create new ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          email_account_id: emailAccount.id,
          email_message_id: email.id,
          subject: email.subject || 'Sem assunto',
          description: email.bodyPreview || 'Sem conteúdo',
          from_email: email.from?.emailAddress?.address || 'unknown@email.com',
          from_name: email.from?.emailAddress?.name || 'Desconhecido',
          status: 'new',
          priority: email.importance === 'high' ? 'high' : 'medium',
          has_attachments: email.hasAttachments || false,
        })

      if (!ticketError) {
        created++
        
        // Mark email as read
        try {
          await emailService.markAsRead(email.id!)
        } catch (err) {
          console.error('Error marking email as read:', err)
        }
      }
    }

    // Log sync activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'email_sync',
      entity_type: 'email_account',
      entity_id: emailAccount.id,
      details: {
        emails_found: emails.length,
        tickets_created: created,
        tickets_skipped: skipped
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        emails_found: emails.length,
        tickets_created: created,
        tickets_skipped: skipped
      }
    })

  } catch (error) {
    console.error('Email sync error:', error)
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Get sync status for all accounts
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's email accounts with last sync info
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select(`
        id,
        email,
        provider,
        is_active,
        last_sync_at,
        created_at
      `)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get sync stats for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const { count: ticketCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('email_account_id', account.id)

        return {
          ...account,
          ticket_count: ticketCount || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts: accountsWithStats
    })

  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sync status' 
    }, { status: 500 })
  }
}