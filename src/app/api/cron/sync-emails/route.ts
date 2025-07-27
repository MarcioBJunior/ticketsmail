import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MicrosoftEmailService } from '@/lib/microsoft-graph/email-service'

// This endpoint should be called by Vercel Cron or external cron service
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()
    
    // Get all active email accounts that need syncing
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true)
    
    if (error) throw error
    
    const results = []
    
    for (const account of accounts || []) {
      // Check if it's time to sync based on sync_frequency
      const lastSync = account.last_sync_at ? new Date(account.last_sync_at) : new Date(0)
      const nextSync = new Date(lastSync.getTime() + account.sync_frequency * 60 * 1000)
      
      if (new Date() < nextSync) {
        continue // Skip this account, not time yet
      }
      
      try {
        // Sync is starting
        
        const emailService = new MicrosoftEmailService(account.access_token)
        
        // Get emails from the last 7 days or since last sync
        const since = new Date()
        since.setDate(since.getDate() - 7)
        
        const emails = await emailService.getEmails({
          folders: account.folders_to_sync,
          startDate: lastSync > since ? lastSync : since
        })
        
        let newTicketsCount = 0
        
        // Process each email
        for (const email of emails) {
          // Check if ticket already exists
          const { data: existingTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('email_message_id', email.id)
            .single()
          
          if (!existingTicket) {
            // Create new ticket
            const { data: ticket, error: ticketError } = await supabase
              .from('tickets')
              .insert({
                title: email.subject || 'Sem assunto',
                description: email.bodyPreview || '',
                status: 'new',
                priority: determinePriority(email),
                customer_email: email.from?.emailAddress?.address || 'unknown@email.com',
                customer_name: email.from?.emailAddress?.name || 'Unknown',
                email_message_id: email.id,
                email_account_id: account.id,
                metadata: {
                  originalEmail: email,
                  receivedAt: email.receivedDateTime
                }
              })
              .select()
              .single()
            
            if (!ticketError && ticket) {
              newTicketsCount++
              
              // Ticket created successfully
              
              // Auto-assign ticket if rules are configured
              await autoAssignTicket(supabase, ticket)
            }
          }
        }
        
        // Update last sync time
        await supabase
          .from('email_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', account.id)
        
        // Sync completed
        
        results.push({
          account: account.email,
          success: true,
          newTickets: newTicketsCount,
          totalEmails: emails.length
        })
        
      } catch (error: any) {
        results.push({
          account: account.email,
          success: false,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Determine ticket priority based on email characteristics
function determinePriority(email: any): string {
  // High priority indicators
  if (email.importance === 'high' || 
      email.subject?.toLowerCase().includes('urgent') ||
      email.subject?.toLowerCase().includes('urgente') ||
      email.subject?.toLowerCase().includes('crítico') ||
      email.subject?.toLowerCase().includes('critical')) {
    return 'high'
  }
  
  // Check for keywords that indicate medium priority
  if (email.subject?.toLowerCase().includes('importante') ||
      email.subject?.toLowerCase().includes('important') ||
      email.subject?.toLowerCase().includes('asap')) {
    return 'medium'
  }
  
  return 'low'
}

// Auto-assign ticket based on rules
async function autoAssignTicket(supabase: any, ticket: any) {
  try {
    // Get assignment rules (you can expand this with more complex logic)
    // For now, let's implement round-robin assignment
    
    // Get all active users
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'agent')
      .eq('is_active', true)
    
    if (!users || users.length === 0) return
    
    // Get the user with least assigned tickets
    const { data: assignments } = await supabase
      .from('tickets')
      .select('assigned_to')
      .eq('status', 'in_progress')
      .not('assigned_to', 'is', null)
    
    const assignmentCounts = users.reduce((acc: any, user: any) => {
      acc[user.id] = 0
      return acc
    }, {})
    
    assignments?.forEach((assignment: any) => {
      if (assignmentCounts[assignment.assigned_to] !== undefined) {
        assignmentCounts[assignment.assigned_to]++
      }
    })
    
    // Find user with least assignments
    let selectedUser = users[0]
    let minCount = assignmentCounts[selectedUser.id]
    
    users.forEach((user: any) => {
      if (assignmentCounts[user.id] < minCount) {
        selectedUser = user
        minCount = assignmentCounts[user.id]
      }
    })
    
    // Assign the ticket
    await supabase
      .from('tickets')
      .update({ 
        assigned_to: selectedUser.id,
        status: 'in_progress'
      })
      .eq('id', ticket.id)
    
    // User assigned successfully
    
  } catch (error) {
    // Silent fail - auto-assignment is not critical
  }
}