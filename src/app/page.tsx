import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { RealtimeMetrics } from '@/components/dashboard/realtime-metrics'
import { TicketQueue } from '@/components/tickets/ticket-queue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema em tempo real
          </p>
        </div>

        {/* Real-time Metrics */}
        <RealtimeMetrics />

        {/* Ticket Queue and Quick Actions */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TicketQueue />
          </div>
          
          {/* Quick Actions and Status */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/tickets" className="block">
                  <Button className="w-full">Ver Todos os Tickets</Button>
                </Link>
                <Link href="/emails" className="block">
                  <Button className="w-full" variant="outline">Gerenciar Emails</Button>
                </Link>
                <Link href="/users" className="block">
                  <Button className="w-full" variant="outline">Gerenciar Usuários</Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button className="w-full" variant="outline">Configurações</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sincronização</span>
                    <span className="text-green-600">Ativa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo Real</span>
                    <span className="text-green-600">Conectado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última Sync</span>
                    <span>Há 2 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}