'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Mail, Settings, Trash2, Edit, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { EmailAccountDialog } from '@/components/emails/email-account-dialog'
import { EmailSyncSettings } from '@/components/emails/email-sync-settings'
import { toast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface EmailAccount {
  id: string
  email: string
  provider: 'microsoft' | 'google'
  is_active: boolean
  sync_enabled: boolean
  last_sync_at: string | null
  sync_frequency: number
  folders_to_sync: string[]
  created_at: string
  updated_at: string
  access_token?: string
  refresh_token?: string
}

export default function EmailsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<EmailAccount | null>(null)
  const supabase = createClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching email accounts:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas de email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const handleDelete = async () => {
    if (!deletingAccount) return

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', deletingAccount.id)

      if (error) throw error

      setAccounts(prev => prev.filter(acc => acc.id !== deletingAccount.id))
      toast({
        title: "Sucesso",
        description: "Conta de email removida com sucesso",
      })
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover a conta de email",
        variant: "destructive",
      })
    } finally {
      setDeletingAccount(null)
    }
  }

  const handleSync = async (accountId: string) => {
    setSyncing(accountId)
    try {
      const response = await fetch(`/api/emails/sync/${accountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha na sincronização')
      }

      toast({
        title: "Sincronização concluída",
        description: data.message || "Emails sincronizados com sucesso",
      })

      // Refresh accounts to show updated sync time
      await fetchAccounts()
    } catch (error: any) {
      console.error('Error syncing emails:', error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível sincronizar os emails",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
    }
  }

  const toggleAccountStatus = async (account: EmailAccount) => {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id)

      if (error) throw error

      setAccounts(prev => prev.map(acc => 
        acc.id === account.id 
          ? { ...acc, is_active: !account.is_active }
          : acc
      ))

      toast({
        title: "Sucesso",
        description: `Conta ${!account.is_active ? 'ativada' : 'desativada'} com sucesso`,
      })
    } catch (error) {
      console.error('Error toggling account status:', error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da conta",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const checkAuthAndTokens = async () => {
      // First check if we have pending tokens - this means we're coming from OAuth callback
      const hasPendingTokens = localStorage.getItem('pending_microsoft_tokens')
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && !hasPendingTokens) {
        // Only redirect to login if no session AND no pending tokens
        window.location.href = '/login'
        return
      }
      
      if (!session && hasPendingTokens) {
        // We have tokens but no session - user was logged out during OAuth
        // Redirect to login but preserve the tokens
        window.location.href = '/login?redirect=/emails&oauth=microsoft'
        return
      }
      
      setIsAuthenticated(true)
      
      // Check for pending Microsoft tokens
      const pendingTokensStr = localStorage.getItem('pending_microsoft_tokens')
      if (pendingTokensStr) {
        try {
          const pendingTokens = JSON.parse(pendingTokensStr)
          
          // Validate required fields
          if (!pendingTokens.email || !pendingTokens.access_token) {
            throw new Error('Tokens inválidos ou incompletos')
          }
          
          // Use the stored user ID if available, otherwise use session
          const finalUserId = pendingTokens.userId || session.user.id
          
          if (!finalUserId) {
            throw new Error('ID de usuário não encontrado')
          }
          
          // Calculate token expiration
          const tokenExpiresAt = pendingTokens.expires_in 
            ? new Date(Date.now() + pendingTokens.expires_in * 1000).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString() // Default to 1 hour
          
          // Prepare data for insert
          const insertPayload = {
            user_id: finalUserId,
            email: pendingTokens.email,
            provider: 'microsoft' as const,
            access_token: pendingTokens.access_token,
            refresh_token: pendingTokens.refresh_token || null,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            sync_enabled: true,
            sync_frequency: pendingTokens.sync_frequency || 30,
            folders_to_sync: ['Inbox'],
            metadata: pendingTokens.name ? { name: pendingTokens.name } : {}
          }
          
          // Save the email account with the pending tokens
          const { data: insertData, error } = await supabase
            .from('email_accounts')
            .insert(insertPayload)
            .select()
          
          if (error) {
            if (error.code === '23505') {
              toast({
                title: "Aviso",
                description: "Esta conta de email já está conectada",
                variant: "default",
              })
            } else {
              throw new Error(error.message || 'Erro ao inserir conta de email')
            }
          } else {
            toast({
              title: "Sucesso!",
              description: `Conta ${pendingTokens.email} conectada com sucesso`,
            })
          }
          
          // Clear pending tokens
          localStorage.removeItem('pending_microsoft_tokens')
          localStorage.removeItem('pending_email_account')
          localStorage.removeItem('oauth_state')
        } catch (error: any) {
          toast({
            title: "Erro",
            description: error?.message || "Não foi possível processar a conexão pendente",
            variant: "destructive",
          })
          // Clear invalid tokens
          localStorage.removeItem('pending_microsoft_tokens')
          localStorage.removeItem('pending_email_account')
          localStorage.removeItem('oauth_state')
        }
      }
      
      // Fetch accounts after processing any pending tokens
      fetchAccounts()
    }
    
    checkAuthAndTokens()
  }, [])

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'microsoft':
        return '📧'
      case 'google':
        return '📨'
      default:
        return '✉️'
    }
  }

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca sincronizado'
    return new Date(date).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas de E-mail</h2>
            <p className="text-muted-foreground">
              Gerencie as contas de email para captura automática de tickets
            </p>
          </div>
          <Button onClick={() => {
            setEditingAccount(null)
            setDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Conta
          </Button>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Mail className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma conta configurada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione uma conta de email para começar a capturar tickets automaticamente
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <span>{getProviderIcon(account.provider)}</span>
                        <span>{account.email}</span>
                      </CardTitle>
                      <CardDescription>
                        {account.provider === 'microsoft' ? 'Microsoft/Outlook' : 'Gmail'}
                      </CardDescription>
                    </div>
                    <Badge variant={account.is_active ? "success" : "secondary"}>
                      {account.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sincronização:</span>
                      <div className="flex items-center space-x-1">
                        {account.sync_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{account.sync_enabled ? 'Ativada' : 'Desativada'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Frequência:</span>
                      <span>{account.sync_frequency} minutos</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Última sync:</span>
                      <span className="text-xs">{formatLastSync(account.last_sync_at)}</span>
                    </div>
                    {account.folders_to_sync && account.folders_to_sync.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Pastas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {account.folders_to_sync.map((folder, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {folder}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(account.id)}
                      disabled={syncing === account.id || !account.is_active}
                    >
                      {syncing === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Sincronizar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAccount(account)
                        setSyncSettingsOpen(true)
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAccount(account)
                        setDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAccountStatus(account)}
                    >
                      {account.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingAccount(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <EmailAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={editingAccount}
          onSuccess={() => {
            fetchAccounts()
            setDialogOpen(false)
            setEditingAccount(null)
          }}
        />

        {editingAccount && (
          <EmailSyncSettings
            open={syncSettingsOpen}
            onOpenChange={setSyncSettingsOpen}
            account={editingAccount}
            onSuccess={() => {
              fetchAccounts()
              setSyncSettingsOpen(false)
              setEditingAccount(null)
            }}
          />
        )}

        <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a conta <strong>{deletingAccount?.email}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  )
}