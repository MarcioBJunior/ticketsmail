import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      eventSource = new EventSource('/api/sse/tickets')

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        // Reconnect after 5 seconds
        setTimeout(connect, 5000)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'new_tickets':
              data.tickets.forEach((ticket: any) => {
                toast({
                  title: '🎫 Novo Ticket',
                  description: `${ticket.title} - ${ticket.customer_email}`,
                })
              })
              router.refresh()
              break

            case 'updated_tickets':
              // Only refresh if we're on a relevant page
              if (window.location.pathname.includes('/tickets')) {
                router.refresh()
              }
              break

            case 'heartbeat':
              // Keep connection alive
              break
          }
        } catch (error) {
          console.error('SSE parse error:', error)
        }
      }
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [router])

  return { isConnected }
}