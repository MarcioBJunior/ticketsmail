'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Ticket,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Timer
} from 'lucide-react'

export function SimpleDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Metric Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">
            Sistema pronto para uso
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
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
          <div className="text-2xl font-bold">0</div>
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
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">
            Média de primeira resposta
          </p>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Sistema de Tickets em Tempo Real</CardTitle>
          <CardDescription>
            Configure suas contas de email para começar a receber tickets automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✅ Dashboard em tempo real configurado</p>
            <p>✅ Sistema de filas e prioridades ativo</p>
            <p>✅ Templates de resposta disponíveis</p>
            <p>✅ Sincronização automática preparada</p>
            <p className="text-muted-foreground mt-4">
              Para ativar o sistema completo, configure o Pusher para notificações em tempo real.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}