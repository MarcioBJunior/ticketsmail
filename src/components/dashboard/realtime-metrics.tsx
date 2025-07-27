'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime'
import { 
  Ticket,
  AlertCircle,
  CheckCircle,
  Timer,
  TrendingUp,
  Users
} from 'lucide-react'

interface Metrics {
  totalTickets: number
  openTickets: number
  resolvedToday: number
  avgResponseTime: number
  activeAgents: number
  ticketsToday: number
}

export function RealtimeMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalTickets: 0,
    openTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    activeAgents: 0,
    ticketsToday: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { isConnected } = useSupabaseRealtime()

  const fetchMetrics = async () => {
    try {
      // Get all tickets
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')

      if (error) throw error

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculate metrics
      const totalTickets = tickets?.length || 0
      const openTickets = tickets?.filter(t => 
        t.status !== 'resolved' && t.status !== 'closed'
      ).length || 0

      const resolvedToday = tickets?.filter(t => 
        t.status === 'resolved' && 
        new Date(t.updated_at) >= today
      ).length || 0

      const ticketsToday = tickets?.filter(t => 
        new Date(t.created_at) >= today
      ).length || 0

      // Calculate average response time
      const responseTimes = tickets
        ?.filter(t => t.first_response_at)
        .map(t => {
          const created = new Date(t.created_at)
          const responded = new Date(t.first_response_at)
          return (responded.getTime() - created.getTime()) / (1000 * 60) // minutes
        }) || []
      
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0

      // Get active agents (those with assigned tickets)
      const activeAgents = new Set(
        tickets?.filter(t => t.assigned_to && t.status === 'in_progress')
          .map(t => t.assigned_to)
      ).size

      setMetrics({
        totalTickets,
        openTickets,
        resolvedToday,
        avgResponseTime,
        activeAgents,
        ticketsToday
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('metrics-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          // Refresh metrics when tickets change
          fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalTickets}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.ticketsToday} novos hoje
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.openTickets}</div>
          <p className="text-xs text-muted-foreground">
            Aguardando resolução
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolvidos Hoje</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.resolvedToday}</div>
          <p className="text-xs text-muted-foreground">
            Tickets finalizados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.avgResponseTime > 0 ? `${metrics.avgResponseTime}m` : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            Média de primeira resposta
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeAgents}</div>
          <p className="text-xs text-muted-foreground">
            Atendendo tickets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">Ativo</div>
          <p className="text-xs text-muted-foreground">
            {isConnected ? 'Tempo real conectado' : 'Aguardando conexão'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}