import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ITicket } from '@/types/database'

interface TicketCardProps {
  ticket: ITicket & {
    email_accounts?: { email: string; provider: string }
    assigned_user?: { name: string; email: string }
  }
}

const statusColors = {
  new: 'secondary',
  in_progress: 'warning',
  waiting_response: 'outline',
  resolved: 'success',
  closed: 'default'
} as const

const priorityColors = {
  low: 'outline',
  medium: 'secondary',
  high: 'warning',
  urgent: 'destructive'
} as const

const statusLabels = {
  new: 'Novo',
  in_progress: 'Em Andamento',
  waiting_response: 'Aguardando',
  resolved: 'Resolvido',
  closed: 'Fechado'
} as const

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
} as const

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base">
                {ticket.subject}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                #{ticket.ticket_number}
              </Badge>
            </div>
            <CardDescription>
              De: {ticket.from_name || ticket.from_email} • 
              {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={priorityColors[ticket.priority]}>
              {priorityLabels[ticket.priority]}
            </Badge>
            <Badge variant={statusColors[ticket.status]}>
              {statusLabels[ticket.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>
              Responsável: {ticket.assigned_user?.name || 'Não atribuído'}
            </span>
            <span>
              Via: {ticket.email_accounts?.email}
            </span>
          </div>
          <Button variant="outline" size="sm">
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}