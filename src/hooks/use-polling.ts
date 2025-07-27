import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface PollingOptions {
  interval?: number // milliseconds
  enabled?: boolean
}

export function usePolling(options: PollingOptions = {}) {
  const { interval = 10000, enabled = true } = options // Default 10 seconds
  const [lastCheck, setLastCheck] = useState<Date>(new Date())
  const [isPolling, setIsPolling] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled) return

    const checkForUpdates = async () => {
      setIsPolling(true)
      try {
        // Check for new tickets since last check
        const { data: newTickets } = await supabase
          .from('tickets')
          .select('*')
          .gt('created_at', lastCheck.toISOString())
          .order('created_at', { ascending: false })

        if (newTickets && newTickets.length > 0) {
          // Show notification for the newest ticket
          const latestTicket = newTickets[0]
          toast({
            title: '🎫 Novo Ticket',
            description: `${latestTicket.title} - ${latestTicket.customer_email}`,
          })

          // Refresh current page
          router.refresh()
        }

        // Check for updates on current page
        const currentPath = window.location.pathname
        if (currentPath.includes('/tickets/')) {
          const ticketId = currentPath.split('/').pop()
          
          const { data: ticketUpdates } = await supabase
            .from('tickets')
            .select('updated_at')
            .eq('id', ticketId)
            .single()

          if (ticketUpdates && new Date(ticketUpdates.updated_at) > lastCheck) {
            router.refresh()
          }
        }

        setLastCheck(new Date())
      } catch (error) {
        console.error('Polling error:', error)
      } finally {
        setIsPolling(false)
      }
    }

    // Initial check
    checkForUpdates()

    // Set up interval
    intervalRef.current = setInterval(checkForUpdates, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval, lastCheck, router, supabase])

  return { isPolling, lastCheck }
}