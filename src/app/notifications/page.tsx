'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Loader2, Bell, Mail, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface NotificationPreferences {
  id: string
  email_enabled: boolean
  email_ticket_assigned: boolean
  email_ticket_updated: boolean
  email_new_interaction: boolean
  email_status_changed: boolean
  email_priority_changed: boolean
  email_mention: boolean
  in_app_enabled: boolean
  in_app_ticket_assigned: boolean
  in_app_ticket_updated: boolean
  in_app_new_interaction: boolean
  in_app_status_changed: boolean
  in_app_priority_changed: boolean
  in_app_mention: boolean
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  read_at: string | null
  created_at: string
  ticket_id: string | null
  metadata: any
}

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const notificationTypes = [
    { key: 'ticket_assigned', label: 'Ticket atribuído', description: 'Quando um ticket é atribuído a você' },
    { key: 'ticket_updated', label: 'Ticket atualizado', description: 'Quando um ticket que você acompanha é atualizado' },
    { key: 'new_interaction', label: 'Nova interação', description: 'Quando há uma nova resposta ou comentário' },
    { key: 'status_changed', label: 'Status alterado', description: 'Quando o status de um ticket muda' },
    { key: 'priority_changed', label: 'Prioridade alterada', description: 'Quando a prioridade de um ticket muda' },
    { key: 'mention', label: 'Menção', description: 'Quando você é mencionado em um comentário' },
  ]

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      // Fetch preferences
      let { data: prefs, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.user.id)
        .single()

      if (prefsError) {
        if (prefsError.code === '42P01') {
          // Table doesn't exist
          console.log('Notifications tables not found. Migration needs to be applied.')
          toast({
            title: "Sistema não configurado",
            description: "As tabelas de notificações precisam ser criadas. Execute a migração SQL.",
            variant: "destructive",
          })
          setLoading(false)
          return
        } else if (prefsError.code === 'PGRST116') {
          // No preferences exist, create default ones
          const { data: newPrefs, error: createError } = await supabase
            .from('notification_preferences')
            .insert({ user_id: user.user.id })
            .select()
            .single()

          if (createError) throw createError
          prefs = newPrefs
        } else {
          throw prefsError
        }
      }

      setPreferences(prefs)

      // Fetch notifications
      const { data: notifs, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (notifsError && notifsError.code !== '42P01') {
        throw notifsError
      }
      
      setNotifications(notifs || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('user_id', user.user.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Preferências de notificação salvas",
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .rpc('mark_notification_read', { p_notification_id: notificationId })

      if (error) throw error

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { error } = await supabase
        .rpc('mark_all_notifications_read', { p_user_id: user.user.id })

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )

      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações como lidas",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_assigned':
        return '👤'
      case 'new_interaction':
        return '💬'
      case 'status_changed':
        return '🔄'
      case 'priority_changed':
        return '⚡'
      case 'mention':
        return '@'
      default:
        return '📢'
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notificações</h2>
          <p className="text-muted-foreground">
            Gerencie suas notificações e preferências
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Mail className="h-4 w-4 mr-2" />
              Preferências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {notifications.length > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {notifications.filter(n => !n.read).length} notificações não lidas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={notifications.every(n => n.read)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              </div>
            )}

            {notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Bell className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
                  <p className="text-muted-foreground text-center">
                    Suas notificações aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors ${
                      !notification.read ? 'border-primary/50 bg-muted/30' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            {preferences && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações por E-mail</CardTitle>
                    <CardDescription>
                      Escolha quais notificações você deseja receber por e-mail
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-enabled" className="cursor-pointer">
                        <div>
                          <p className="font-medium">Ativar notificações por e-mail</p>
                          <p className="text-sm text-muted-foreground">
                            Receba notificações importantes no seu e-mail
                          </p>
                        </div>
                      </Label>
                      <Switch
                        id="email-enabled"
                        checked={preferences.email_enabled}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, email_enabled: checked })
                        }
                      />
                    </div>

                    <Separator />

                    {preferences.email_enabled && (
                      <div className="space-y-4">
                        {notificationTypes.map((type) => (
                          <div key={type.key} className="flex items-center justify-between">
                            <Label
                              htmlFor={`email-${type.key}`}
                              className="cursor-pointer"
                            >
                              <div>
                                <p className="font-medium">{type.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {type.description}
                                </p>
                              </div>
                            </Label>
                            <Switch
                              id={`email-${type.key}`}
                              checked={preferences[`email_${type.key}` as keyof NotificationPreferences] as boolean}
                              onCheckedChange={(checked) =>
                                setPreferences({
                                  ...preferences,
                                  [`email_${type.key}`]: checked,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notificações no Sistema</CardTitle>
                    <CardDescription>
                      Escolha quais notificações você deseja ver no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-enabled" className="cursor-pointer">
                        <div>
                          <p className="font-medium">Ativar notificações no sistema</p>
                          <p className="text-sm text-muted-foreground">
                            Veja notificações em tempo real no sistema
                          </p>
                        </div>
                      </Label>
                      <Switch
                        id="in-app-enabled"
                        checked={preferences.in_app_enabled}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, in_app_enabled: checked })
                        }
                      />
                    </div>

                    <Separator />

                    {preferences.in_app_enabled && (
                      <div className="space-y-4">
                        {notificationTypes.map((type) => (
                          <div key={type.key} className="flex items-center justify-between">
                            <Label
                              htmlFor={`in-app-${type.key}`}
                              className="cursor-pointer"
                            >
                              <div>
                                <p className="font-medium">{type.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {type.description}
                                </p>
                              </div>
                            </Label>
                            <Switch
                              id={`in-app-${type.key}`}
                              checked={preferences[`in_app_${type.key}` as keyof NotificationPreferences] as boolean}
                              onCheckedChange={(checked) =>
                                setPreferences({
                                  ...preferences,
                                  [`in_app_${type.key}`]: checked,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={savePreferences} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Preferências
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}