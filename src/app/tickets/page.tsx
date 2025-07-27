'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { TicketList } from '@/components/tickets/ticket-list'
import { TicketKanban } from '@/components/tickets/ticket-kanban'
import { TicketFiltersBar } from '@/components/tickets/ticket-filters-bar'
import { TicketStats } from '@/components/tickets/ticket-stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List,
  Plus,
  RefreshCw,
  Download
} from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface Ticket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  from_email: string
  from_name: string | null
  created_at: string
  updated_at: string
  assigned_to: string | null
  email_account_id: string | null
  tags?: string[]
  sla_deadline?: string
  first_response_at?: string
  email_accounts?: {
    email: string
    provider: string
  }
  assigned_user?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  _count?: {
    interactions: number
  }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply search
      const search = searchParams.get('search') || searchTerm
      if (search) {
        query = query.or(`ticket_number.ilike.%${search}%,subject.ilike.%${search}%,from_email.ilike.%${search}%,from_name.ilike.%${search}%`)
      }

      // Apply filters from URL params
      const status = searchParams.get('status')
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const priority = searchParams.get('priority')
      if (priority && priority !== 'all') {
        query = query.eq('priority', priority)
      }

      const assignedTo = searchParams.get('assigned_to')
      if (assignedTo === 'unassigned') {
        query = query.is('assigned_to', null)
      } else if (assignedTo === 'me') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single()
          
          if (profile) {
            query = query.eq('assigned_to', profile.id)
          }
        }
      }

      // Date range filters
      const dateFrom = searchParams.get('from')
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`)
      }

      const dateTo = searchParams.get('to')
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`)
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        // Get unique user IDs and email account IDs
        const userIds = [...new Set(data.filter(t => t.assigned_to).map(t => t.assigned_to))]
        const emailAccountIds = [...new Set(data.filter(t => t.email_account_id).map(t => t.email_account_id))]
        
        // Fetch users
        let usersMap: any = {}
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .in('id', userIds)
          
          if (users) {
            usersMap = users.reduce((acc: any, user) => {
              acc[user.id] = user
              return acc
            }, {})
          }
        }

        // Fetch email accounts
        let emailAccountsMap: any = {}
        if (emailAccountIds.length > 0) {
          const { data: emailAccounts } = await supabase
            .from('email_accounts')
            .select('id, email, provider')
            .in('id', emailAccountIds)
          
          if (emailAccounts) {
            emailAccountsMap = emailAccounts.reduce((acc: any, account) => {
              acc[account.id] = account
              return acc
            }, {})
          }
        }

        // Get interaction counts
        const ticketIds = data.map(t => t.id)
        const { data: counts } = await supabase
          .from('ticket_interactions')
          .select('ticket_id')
          .in('ticket_id', ticketIds)

        const countMap = counts?.reduce((acc: any, curr) => {
          acc[curr.ticket_id] = (acc[curr.ticket_id] || 0) + 1
          return acc
        }, {})

        // Combine all data
        const ticketsWithRelations = data.map(ticket => ({
          ...ticket,
          assigned_user: ticket.assigned_to ? usersMap[ticket.assigned_to] : null,
          email_accounts: ticket.email_account_id ? emailAccountsMap[ticket.email_account_id] : null,
          _count: {
            interactions: countMap?.[ticket.id] || 0
          }
        }))

        setTickets(ticketsWithRelations)
      } else {
        setTickets([])
      }
    } catch (err) {
      console.error('Error fetching tickets:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tickets',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTickets()

    // Set up real-time subscription
    const channel = supabase
      .channel('tickets-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTickets(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm) {
      params.set('search', searchTerm)
    } else {
      params.delete('search')
    }
    router.push(`/tickets?${params.toString()}`)
  }

  const handleExport = async () => {
    try {
      const csv = [
        ['Número', 'Título', 'Status', 'Prioridade', 'Cliente', 'Criado em', 'Responsável'],
        ...tickets.map(t => [
          t.ticket_number,
          t.subject,
          t.status,
          t.priority,
          t.from_email,
          new Date(t.created_at).toLocaleDateString('pt-BR'),
          t.assigned_user?.name || 'Não atribuído'
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Exportado com sucesso',
        description: 'Os tickets foram exportados para CSV'
      })
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar os tickets',
        variant: 'destructive'
      })
    }
  }

  const handleBulkAction = async (action: string, ticketIds: string[]) => {
    try {
      switch (action) {
        case 'resolve':
          await supabase
            .from('tickets')
            .update({ status: 'resolved' })
            .in('id', ticketIds)
          break
        case 'close':
          await supabase
            .from('tickets')
            .update({ status: 'closed' })
            .in('id', ticketIds)
          break
        case 'delete':
          if (confirm(`Tem certeza que deseja excluir ${ticketIds.length} tickets?`)) {
            await supabase
              .from('tickets')
              .delete()
              .in('id', ticketIds)
          }
          break
      }
      
      toast({
        title: 'Ação concluída',
        description: `${ticketIds.length} tickets foram atualizados`
      })
      
      fetchTickets(true)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a ação',
        variant: 'destructive'
      })
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tickets</h2>
            <p className="text-muted-foreground">
              Gerencie todos os tickets do sistema
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </div>
        </div>

        {/* Stats */}
        <TicketStats />

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, título, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {Object.keys(searchParams).length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {Object.keys(searchParams).length}
                </span>
              )}
            </Button>
            
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        {showFilters && (
          <TicketFiltersBar 
            onClose={() => setShowFilters(false)}
            onApply={() => fetchTickets()}
          />
        )}

        {/* Content */}
        <Tabs value={viewMode} className="space-y-4">
          <TabsContent value="list" className="mt-0">
            <TicketList 
              tickets={tickets}
              loading={loading}
              onRefresh={() => fetchTickets(true)}
              onBulkAction={handleBulkAction}
            />
          </TabsContent>
          
          <TabsContent value="kanban" className="mt-0">
            <TicketKanban 
              tickets={tickets}
              loading={loading}
              onRefresh={() => fetchTickets(true)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}