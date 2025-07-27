'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp } from 'lucide-react'

interface TicketStats {
  total: number
  new: number
  inProgress: number
  resolved: number
  overdue: number
  avgResponseTime: number
}

export function TicketStats() {
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    overdue: 0,
    avgResponseTime: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Get all tickets
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('id, status, created_at, updated_at')

      if (error) throw error

      if (tickets) {
        const now = new Date()
        let totalResponseTime = 0
        let responseCount = 0
        
        const stats = tickets.reduce((acc, ticket) => {
          acc.total++
          
          // Count by status
          if (ticket.status === 'new') acc.new++
          else if (ticket.status === 'in_progress') acc.inProgress++
          else if (ticket.status === 'resolved' || ticket.status === 'closed') {
            acc.resolved++
            
            // Calculate response time for resolved tickets
            const created = new Date(ticket.created_at)
            const updated = new Date(ticket.updated_at)
            const responseTime = (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
            totalResponseTime += responseTime
            responseCount++
          }
          
          // Check if overdue (new tickets > 4 hours)
          if (ticket.status === 'new') {
            const created = new Date(ticket.created_at)
            const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
            if (hoursElapsed > 4) acc.overdue++
          }
          
          return acc
        }, {
          total: 0,
          new: 0,
          inProgress: 0,
          resolved: 0,
          overdue: 0,
          avgResponseTime: 0
        })
        
        stats.avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0
        setStats(stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total de Tickets',
      value: stats.total,
      icon: Inbox,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Novos',
      value: stats.new,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Em Andamento',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Resolvidos',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Vencidos (SLA)',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Tempo Médio (h)',
      value: stats.avgResponseTime,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-full`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}