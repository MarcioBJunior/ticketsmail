import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export default function SettingsPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">
            Configurações do sistema
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <h3 className="text-lg font-semibold mb-2">Em desenvolvimento</h3>
            <p className="text-muted-foreground text-center">
              A página de configurações será implementada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}