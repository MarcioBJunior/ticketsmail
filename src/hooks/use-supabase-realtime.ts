import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeTicket {
  id: string
  title: string
  status: string
  priority: string
  customer_email: string
  created_at: string
}

export function useSupabaseRealtime() {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Create a channel for real-time updates
    const ticketChannel = supabase
      .channel('tickets-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          const newTicket = payload.new as RealtimeTicket
          
          // Show notification
          toast({
            title: '🎫 Novo Ticket',
            description: `${newTicket.title} - ${newTicket.customer_email}`,
          })

          // Play notification sound
          const audio = new Audio('/notification.mp3')
          audio.play().catch(() => {})

          // Refresh if on tickets page
          if (window.location.pathname.includes('/tickets')) {
            router.refresh()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          const updatedTicket = payload.new as RealtimeTicket
          
          // Refresh if viewing this ticket
          if (window.location.pathname.includes(`/tickets/${updatedTicket.id}`)) {
            router.refresh()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_interactions'
        },
        (payload) => {
          // Refresh the page to show new interaction
          router.refresh()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(ticketChannel)

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router, supabase])

  return { isConnected }
}