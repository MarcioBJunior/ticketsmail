import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const customReadable = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      )

      // Set up interval to check for updates
      const interval = setInterval(async () => {
        try {
          // Get recent tickets (last 5 seconds)
          const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
          
          const { data: newTickets } = await supabase
            .from('tickets')
            .select('*')
            .gte('created_at', fiveSecondsAgo)
            .order('created_at', { ascending: false })

          if (newTickets && newTickets.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'new_tickets', 
                  tickets: newTickets 
                })}\n\n`
              )
            )
          }

          // Check for updated tickets
          const { data: updatedTickets } = await supabase
            .from('tickets')
            .select('*')
            .gte('updated_at', fiveSecondsAgo)
            .neq('created_at', 'updated_at')
            .order('updated_at', { ascending: false })

          if (updatedTickets && updatedTickets.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'updated_tickets', 
                  tickets: updatedTickets 
                })}\n\n`
              )
            )
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`)
          )
        } catch (error) {
          console.error('SSE Error:', error)
        }
      }, 3000) // Check every 3 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}