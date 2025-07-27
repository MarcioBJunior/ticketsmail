'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  User,
  ChevronRight,
  Loader2
} from 'lucide-react'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  customer_email: string
  customer_name: string
  created_at: string
  updated_at: string
  assigned_to: string | null
  assigned_user?: {
    name: string
    email: string
  }
  sla_deadline?: string
  response_time?: number
}

export function TicketQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQueue, setSelectedQueue] = useState<'unassigned' | 'my_tickets' | 'all'>('unassigned')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTickets()
  }, [selectedQueue])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('tickets')
        .select(`
          *,
          assigned_user:users!assigned_to(name, email)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      // Filter based on selected queue
      if (selectedQueue === 'unassigned') {
        query = query.is('assigned_to', null).neq('status', 'resolved')
      } else if (selectedQueue === 'my_tickets') {
        query = query.eq('assigned_to', user.id).neq('status', 'resolved')
      } else {
        query = query.neq('status', 'resolved')
      }

      const { data, error } = await query

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignToMe = async (ticketId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('tickets')
        .update({ 
          assigned_to: user.id,
          status: 'in_progress'
        })
        .eq('id', ticketId)

      if (!error) {
        await fetchTickets()
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getTimeElapsed = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
      return `${minutes}m`
    } else if (hours < 24) {
      return `${hours}h`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}d`
    }
  }

  const getSLAStatus = (ticket: Ticket) => {
    const created = new Date(ticket.created_at)
    const now = new Date()
    const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

    // SLA thresholds based on priority
    const slaHours = {
      urgent: 1,
      high: 4,
      medium: 8,
      low: 24
    }

    const threshold = slaHours[ticket.priority as keyof typeof slaHours] || 24
    const percentage = (hoursElapsed / threshold) * 100

    if (percentage > 100) {
      return { status: 'overdue', color: 'destructive' }
    } else if (percentage > 75) {
      return { status: 'warning', color: 'warning' }
    } else {
      return { status: 'ok', color: 'success' }
    }
  }

  const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    const sla = getSLAStatus(ticket)

    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push(`/tickets/${ticket.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm line-clamp-1 flex-1">
              {ticket.title}
            </h3>
            <Badge variant={getPriorityColor(ticket.priority)} className="ml-2">
              {ticket.priority}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {ticket.description}
          </p>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span className="text-muted-foreground">
                {ticket.customer_name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className={`h-3 w-3 text-${sla.color}-600`} />
              <span className={`text-${sla.color}-600`}>
                {getTimeElapsed(ticket.created_at)}
              </span>
            </div>
          </div>
          
          {selectedQueue === 'unassigned' && (
            <Button
              size="sm"
              className="w-full mt-3"
              onClick={(e) => {
                e.stopPropagation()
                handleAssignToMe(ticket.id)
              }}
            >
              Assumir Ticket
            </Button>
          )}
          
          {ticket.assigned_user && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {ticket.assigned_user.name}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Fila de Atendimento</CardTitle>
        <CardDescription>
          Gerencie e priorize tickets em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedQueue} onValueChange={(v) => setSelectedQueue(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unassigned">
              Não Atribuídos
              {tickets.filter(t => !t.assigned_to).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {tickets.filter(t => !t.assigned_to).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my_tickets">Meus Tickets</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedQueue} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum ticket nesta fila</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}