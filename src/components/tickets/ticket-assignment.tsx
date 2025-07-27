'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, UserCheck, UserX, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'collaborator'
}

interface TicketAssignmentProps {
  ticketId: string
  currentAssignedTo?: string | null
  currentAssignedUser?: {
    id: string
    name: string
    email: string
  } | null
}

export function TicketAssignment({ 
  ticketId, 
  currentAssignedTo,
  currentAssignedUser 
}: TicketAssignmentProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | 'unassigned'>(
    currentAssignedTo || 'unassigned'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async () => {
    if (selectedUserId === (currentAssignedTo || 'unassigned')) {
      // No change
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedTo: selectedUserId === 'unassigned' ? null : selectedUserId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign ticket')
      }

      toast({
        title: 'Sucesso',
        description: data.message
      })

      router.refresh()
    } catch (error: any) {
      console.error('Error assigning ticket:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atribuir o ticket',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Responsável</label>
        <Select
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          disabled={isLoading || isSubmitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </span>
              ) : selectedUserId === 'unassigned' ? (
                <span className="flex items-center text-muted-foreground">
                  <UserX className="h-4 w-4 mr-2" />
                  Não atribuído
                </span>
              ) : (
                <span className="flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  {users.find(u => u.id === selectedUserId)?.name || 'Usuário'}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="flex items-center">
                <UserX className="h-4 w-4 mr-2" />
                Não atribuído
              </span>
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {user.email}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleAssign}
        disabled={isLoading || isSubmitting || selectedUserId === (currentAssignedTo || 'unassigned')}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Atribuindo...
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4 mr-2" />
            Atribuir Responsável
          </>
        )}
      </Button>
    </div>
  )
}