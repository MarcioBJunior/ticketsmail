'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'
// import { formatDistanceToNow } from 'date-fns'
// import { ptBR } from 'date-fns/locale'

// Função temporária para formatar data
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR')
}
import { Send, MessageCircle, Mail, Loader2 } from 'lucide-react'

interface Interaction {
  id: string
  type: 'email_reply' | 'internal_comment'
  content: string
  created_at: string
  from_email?: string
  from_name?: string
  user_id?: string
  users?: {
    name: string
    email: string
  }
}

interface TicketInteractionsProps {
  ticketId: string
  interactions: Interaction[]
}

export function TicketInteractions({ ticketId, interactions }: TicketInteractionsProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interactionType, setInteractionType] = useState<'internal_comment' | 'email_reply'>('internal_comment')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          type: interactionType === 'email_reply' ? 'reply' : 'comment'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply')
      }

      // Clear the input and refresh
      setNewComment('')
      
      // Show success message
      if (data.emailSent) {
        // Email was sent successfully
        toast({
          title: 'Sucesso',
          description: 'Resposta enviada por email com sucesso!',
        })
      } else if (data.warning) {
        // Interaction saved but email failed
        toast({
          title: 'Atenção',
          description: data.warning,
          variant: 'destructive'
        })
        
      }
      
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar interação',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const sortedInteractions = [...interactions].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="space-y-4">
      {/* Interaction List */}
      <div className="space-y-4">
        {sortedInteractions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma interação ainda</p>
          </div>
        ) : (
          sortedInteractions.map((interaction) => (
            <div key={interaction.id} className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {interaction.type === 'email_reply' ? 
                    (interaction.from_name || interaction.from_email || 'E').charAt(0).toUpperCase() :
                    (interaction.users?.name || 'U').charAt(0).toUpperCase()
                  }
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold">
                    {interaction.type === 'email_reply' 
                      ? interaction.from_name || interaction.from_email
                      : interaction.users?.name || 'Unknown User'
                    }
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {interaction.type === 'email_reply' ? (
                      <><Mail className="h-3 w-3 mr-1" /> Email</>
                    ) : (
                      <><MessageCircle className="h-3 w-3 mr-1" /> Comentário</>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(interaction.created_at)}
                  </span>
                </div>
                <Card className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{interaction.content}</p>
                </Card>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Interaction Form */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex space-x-2">
          <Button
            variant={interactionType === 'internal_comment' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInteractionType('internal_comment')}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Comentário Interno
          </Button>
          <Button
            variant={interactionType === 'email_reply' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInteractionType('email_reply')}
          >
            <Mail className="h-4 w-4 mr-1" />
            Responder por E-mail
          </Button>
        </div>

        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            interactionType === 'internal_comment' 
              ? "Adicione um comentário interno..."
              : "Digite sua resposta por e-mail..."
          }
          rows={4}
          className="resize-none"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {interactionType === 'internal_comment' ? 'Adicionar Comentário' : 'Enviar Resposta'}
          </Button>
        </div>
      </div>
    </div>
  )
}