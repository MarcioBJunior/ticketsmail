'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Clock, 
  MessageSquare,
  AlertTriangle,
  User,
  Calendar,
  Loader2,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'

interface TicketKanbanProps {
  tickets: any[]
  loading: boolean
  onRefresh: () => void
}

export function TicketKanban({ tickets, loading, onRefresh }: TicketKanbanProps) {
  const [draggingTicket, setDraggingTicket] = useState<string | null>(null)
  const supabase = createClient()

  const columns = [
    { id: 'new', title: 'Novos', color: 'border-purple-500' },
    { id: 'in_progress', title: 'Em Andamento', color: 'border-yellow-500' },
    { id: 'waiting_response', title: 'Aguardando', color: 'border-gray-500' },
    { id: 'resolved', title: 'Resolvidos', color: 'border-green-500' }
  ]

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
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

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggingTicket(ticketId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    
    if (!draggingTicket) return

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', draggingTicket)

      if (error) throw error

      toast({
        title: 'Status atualizado',
        description: 'O ticket foi movido com sucesso'
      })

      onRefresh()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o ticket',
        variant: 'destructive'
      })
    } finally {
      setDraggingTicket(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => {
        const columnTickets = tickets.filter(t => t.status === column.id)

        return (
          <div
            key={column.id}
            className={`rounded-lg border-2 ${column.color} bg-muted/50 p-4`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{column.title}</h3>
              <Badge variant="secondary">{columnTickets.length}</Badge>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-move p-4 hover:shadow-md"
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                  >
                    <Link href={`/tickets/${ticket.id}`}>
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            #{ticket.ticket_number}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}
                          >
                            {ticket.priority === 'urgent' && (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {ticket.priority}
                          </Badge>
                        </div>

                        {/* Title */}
                        <h4 className="line-clamp-2 text-sm font-medium">
                          {ticket.subject}
                        </h4>

                        {/* Customer */}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {ticket.from_name?.charAt(0) || ticket.from_email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {ticket.from_name || ticket.from_email}
                          </span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            {ticket._count?.interactions > 0 && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {ticket._count.interactions}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeAgo(ticket.created_at)}
                            </div>
                          </div>
                          
                          {ticket.assigned_user && (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={ticket.assigned_user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {ticket.assigned_user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}

                {/* Add new ticket button */}
                {column.id === 'new' && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Ticket
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        )
      })}
    </div>
  )
}