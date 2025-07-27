'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { TicketInteractions } from '@/components/tickets/ticket-interactions'
import { TicketStatusUpdate } from '@/components/tickets/ticket-status-update'
import { TicketAssignment } from '@/components/tickets/ticket-assignment'
import { AttachmentUpload } from '@/components/attachments/attachment-upload'
import { AttachmentList } from '@/components/attachments/attachment-list'
import { 
  ArrowLeft, 
  Calendar, 
  Mail, 
  User, 
  Tag, 
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface TicketPageProps {
  params: Promise<{ id: string }>
}

export default function TicketPage({ params }: TicketPageProps) {
  const resolvedParams = use(params)
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  }

  const statusLabels = {
    new: 'Novo',
    in_progress: 'Em Andamento',
    waiting_response: 'Aguardando Resposta',
    resolved: 'Resolvido',
    closed: 'Fechado'
  }

  const fetchTicket = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          email_accounts(email, provider),
          assigned_user:users!assigned_to(id, name, email),
          ticket_interactions(*),
          attachments(*, users(name, email))
        `)
        .eq('id', resolvedParams.id)
        .single()

      if (error) throw error
      if (!data) {
        setError('Ticket não encontrado')
        return
      }

      setTicket(data)
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setError('Erro ao carregar ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [resolvedParams.id])

  const handleAttachmentDelete = async (attachmentId: string) => {
    // Remove attachment from local state
    setTicket((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((a: any) => a.id !== attachmentId),
      attachment_count: Math.max(0, (prev.attachment_count || 0) - 1)
    }))
  }

  const handleAttachmentUpload = async (attachment: any) => {
    // Add attachment to local state
    setTicket((prev: any) => ({
      ...prev,
      attachments: [...(prev.attachments || []), attachment],
      attachment_count: (prev.attachment_count || 0) + 1
    }))
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error || !ticket) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-lg text-muted-foreground">{error || 'Ticket não encontrado'}</p>
          <Link href="/tickets">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos Tickets
            </Button>
          </Link>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/tickets">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Ticket #{ticket.ticket_number}</h1>
              <p className="text-muted-foreground">{ticket.subject}</p>
            </div>
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

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">De:</span>
                    <span>{ticket.from_name || ticket.from_email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsável:</span>
                    <span>{ticket.assigned_user?.name || 'Não atribuído'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Atualizado:</span>
                    <span>{new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Interações</span>
                </CardTitle>
                <CardDescription>
                  Histórico de comunicações e comentários internos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TicketInteractions 
                  ticketId={ticket.id} 
                  interactions={ticket.ticket_interactions || []}
                />
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Paperclip className="h-5 w-5" />
                  <span>Anexos</span>
                  {ticket.attachment_count > 0 && (
                    <Badge variant="secondary">{ticket.attachment_count}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Arquivos anexados ao ticket
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AttachmentList 
                  attachments={ticket.attachments || []}
                  canDelete={true}
                  onDelete={handleAttachmentDelete}
                />
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Adicionar Anexos</h4>
                  <AttachmentUpload 
                    ticketId={ticket.id}
                    onUploadComplete={handleAttachmentUpload}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TicketStatusUpdate 
                  ticketId={ticket.id} 
                  currentStatus={ticket.status}
                  currentPriority={ticket.priority}
                />
                <Separator />
                <TicketAssignment
                  ticketId={ticket.id}
                  currentAssignedTo={ticket.assigned_to}
                  currentAssignedUser={ticket.assigned_user}
                />
                <Separator />
                <Button className="w-full" variant="outline">
                  Adicionar Tags
                </Button>
              </CardContent>
            </Card>

            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">ID do Ticket</p>
                  <p className="font-mono text-xs">{ticket.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email da Conta</p>
                  <p className="text-sm">{ticket.email_accounts?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID da Mensagem</p>
                  <p className="font-mono text-xs break-all">{ticket.email_message_id}</p>
                </div>
                {ticket.tags && ticket.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}