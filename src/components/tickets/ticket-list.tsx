'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { 
  MoreVertical, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Mail,
  Calendar,
  Tag
} from 'lucide-react'

interface TicketListProps {
  tickets: any[]
  loading: boolean
  onRefresh: () => void
  onBulkAction: (action: string, ticketIds: string[]) => void
}

export function TicketList({ tickets, loading, onRefresh, onBulkAction }: TicketListProps) {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')

  const priorityConfig = {
    low: { label: 'Baixa', color: 'bg-gray-100 text-gray-700', icon: null },
    medium: { label: 'Média', color: 'bg-blue-100 text-blue-700', icon: null },
    high: { label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  }

  const statusConfig = {
    new: { label: 'Novo', color: 'bg-purple-100 text-purple-700', icon: null },
    in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    waiting_response: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700', icon: MessageSquare },
    resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-700', icon: XCircle }
  }

  const toggleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(tickets.map(t => t.id))
    }
  }

  const toggleSelect = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const handleBulkAction = () => {
    if (bulkAction && selectedTickets.length > 0) {
      onBulkAction(bulkAction, selectedTickets)
      setSelectedTickets([])
      setBulkAction('')
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
      return `${minutes}m atrás`
    } else if (hours < 24) {
      return `${hours}h atrás`
    } else if (hours < 168) {
      const days = Math.floor(hours / 24)
      return `${days}d atrás`
    } else {
      return created.toLocaleDateString('pt-BR')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Nenhum ticket encontrado</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente ajustar os filtros ou aguarde novos tickets chegarem.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedTickets.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
          <span className="text-sm font-medium">
            {selectedTickets.length} selecionado(s)
          </span>
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Ação em lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resolve">Marcar como resolvido</SelectItem>
              <SelectItem value="close">Fechar tickets</SelectItem>
              <SelectItem value="delete">Excluir tickets</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>
            Aplicar
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setSelectedTickets([])}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Tickets Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-4 text-left">
                <Checkbox
                  checked={selectedTickets.length === tickets.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-4 text-left text-sm font-medium">Ticket</th>
              <th className="p-4 text-left text-sm font-medium">Cliente</th>
              <th className="p-4 text-left text-sm font-medium">Status</th>
              <th className="p-4 text-left text-sm font-medium">Prioridade</th>
              <th className="p-4 text-left text-sm font-medium">Responsável</th>
              <th className="p-4 text-left text-sm font-medium">Criado</th>
              <th className="p-4 text-left text-sm font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig]
              const status = statusConfig[ticket.status as keyof typeof statusConfig]
              const PriorityIcon = priority?.icon
              const StatusIcon = status?.icon

              return (
                <tr key={ticket.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onCheckedChange={() => toggleSelect(ticket.id)}
                    />
                  </td>
                  <td className="p-4">
                    <Link 
                      href={`/tickets/${ticket.id}`}
                      className="hover:underline"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">#{ticket.ticket_number}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {ticket.subject}
                        </div>
                        {ticket._count?.interactions > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {ticket._count.interactions}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {ticket.from_name?.charAt(0) || ticket.from_email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {ticket.from_name || 'Sem nome'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.from_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                      {StatusIcon && <StatusIcon className="h-3 w-3" />}
                      {status.label}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${priority.color}`}>
                      {PriorityIcon && <PriorityIcon className="h-3 w-3" />}
                      {priority.label}
                    </div>
                  </td>
                  <td className="p-4">
                    {ticket.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ticket.assigned_user.avatar_url} />
                          <AvatarFallback>
                            {ticket.assigned_user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.assigned_user.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {getTimeAgo(ticket.created_at)}
                    </div>
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/tickets/${ticket.id}`}>
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Alterar status</DropdownMenuItem>
                        <DropdownMenuItem>Atribuir responsável</DropdownMenuItem>
                        <DropdownMenuItem>Adicionar tag</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Excluir ticket
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}