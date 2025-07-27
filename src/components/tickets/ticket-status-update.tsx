'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface TicketStatusUpdateProps {
  ticketId: string
  currentStatus: string
  currentPriority: string
}

export function TicketStatusUpdate({ 
  ticketId, 
  currentStatus, 
  currentPriority 
}: TicketStatusUpdateProps) {
  const [status, setStatus] = useState(currentStatus)
  const [priority, setPriority] = useState(currentPriority)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleUpdate = async () => {
    if (status === currentStatus && priority === currentPriority) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status !== currentStatus ? status : undefined,
          priority: priority !== currentPriority ? priority : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket')
      }

      toast({
        title: 'Sucesso',
        description: data.message
      })

      router.refresh()
    } catch (error: any) {
      console.error('Error updating ticket:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o ticket',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const statusOptions = [
    { value: 'new', label: 'Novo' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'waiting_response', label: 'Aguardando Resposta' },
    { value: 'resolved', label: 'Resolvido' },
    { value: 'closed', label: 'Fechado' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ]

  const hasChanges = status !== currentStatus || priority !== currentPriority

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Prioridade</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleUpdate} 
        className="w-full"
        disabled={!hasChanges || isUpdating}
      >
        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Atualizar Ticket
      </Button>
    </div>
  )
}