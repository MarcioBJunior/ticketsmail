'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { pusherClient, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher/client'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { 
  Ticket,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Timer
} from 'lucide-react'

interface DashboardData {
  totalTickets: number
  openTickets: number
  resolvedToday: number
  avgResponseTime: number
  ticketsByStatus: { name: string; value: number }[]
  ticketsByPriority: { name: string; value: number }[]
  ticketsTrend: { date: string; count: number }[]
  agentPerformance: { name: string; resolved: number; avgTime: number }[]
}

export function RealtimeDashboard() {
  const [data, setData] = useState<DashboardData>({
    totalTickets: 0,
    openTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    ticketsByStatus: [],
    ticketsByPriority: [],
    ticketsTrend: [],
    agentPerformance: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()

    // Subscribe to real-time updates
    const globalChannel = pusherClient.subscribe(PUSHER_CHANNELS.GLOBAL)
    
    globalChannel.bind(PUSHER_EVENTS.TICKET_CREATED, () => {
      fetchDashboardData()
    })
    
    globalChannel.bind(PUSHER_EVENTS.TICKET_STATUS_CHANGED, () => {
      fetchDashboardData()
    })

    return () => {
      pusherClient.unsubscribe(PUSHER_CHANNELS.GLOBAL)
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')

      if (!tickets) return

      // Calculate metrics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const resolvedToday = tickets.filter(t => 
        t.status === 'resolved' && 
        new Date(t.updated_at) >= today
      ).length

      const openTickets = tickets.filter(t => 
        t.status !== 'resolved' && t.status !== 'closed'
      ).length

      // Calculate average response time
      const responseTimes = tickets
        .filter(t => t.first_response_at)
        .map(t => {
          const created = new Date(t.created_at)
          const responded = new Date(t.first_response_at)
          return (responded.getTime() - created.getTime()) / (1000 * 60) // minutes
        })
      
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0

      // Group by status
      const statusGroups = tickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {})

      const ticketsByStatus = Object.entries(statusGroups).map(([name, value]) => ({
        name: translateStatus(name),
        value: value as number
      }))

      // Group by priority
      const priorityGroups = tickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
        return acc
      }, {})

      const ticketsByPriority = Object.entries(priorityGroups).map(([name, value]) => ({
        name: translatePriority(name),
        value: value as number
      }))

      // Trend data (last 7 days)
      const trendData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        
        const count = tickets.filter(t => {
          const created = new Date(t.created_at)
          return created >= date && created < nextDate
        }).length
        
        trendData.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          count
        })
      }

      // Agent performance
      const { data: agents } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'agent')

      const agentPerformance = agents?.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_to === agent.id)
        const resolved = agentTickets.filter(t => t.status === 'resolved').length
        
        const resolutionTimes = agentTickets
          .filter(t => t.status === 'resolved' && t.resolution_time)
          .map(t => t.resolution_time)
        
        const avgTime = resolutionTimes.length > 0
          ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 60) // hours
          : 0

        return {
          name: agent.name || 'Unknown',
          resolved,
          avgTime
        }
      }) || []

      setData({
        totalTickets: tickets.length,
        openTickets,
        resolvedToday,
        avgResponseTime,
        ticketsByStatus,
        ticketsByPriority,
        ticketsTrend: trendData,
        agentPerformance
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'new': 'Novo',
      'in_progress': 'Em Progresso',
      'waiting_response': 'Aguardando',
      'resolved': 'Resolvido',
      'closed': 'Fechado'
    }
    return translations[status] || status
  }

  const translatePriority = (priority: string) => {
    const translations: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'urgent': 'Urgente'
    }
    return translations[priority] || priority
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Metric Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalTickets}</div>
          <p className="text-xs text-muted-foreground">
            +{data.ticketsTrend[6]?.count || 0} hoje
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.openTickets}</div>
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
          <div className="text-2xl font-bold">{data.resolvedToday}</div>
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
          <div className="text-2xl font-bold">{data.avgResponseTime}m</div>
          <p className="text-xs text-muted-foreground">
            Média de primeira resposta
          </p>
        </CardContent>
      </Card>

      {/* Charts */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Tendência de Tickets</CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.ticketsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por Status</CardTitle>
          <CardDescription>Distribuição atual</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.ticketsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.ticketsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por Prioridade</CardTitle>
          <CardDescription>Distribuição de urgência</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ticketsByPriority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Performance dos Agentes</CardTitle>
          <CardDescription>Tickets resolvidos e tempo médio</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.agentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="resolved" fill="#8884d8" name="Resolvidos" />
              <Bar yAxisId="right" dataKey="avgTime" fill="#82ca9d" name="Tempo Médio (h)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}