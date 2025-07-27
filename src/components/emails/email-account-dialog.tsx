'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface EmailAccount {
  id?: string
  email: string
  provider: 'microsoft' | 'google'
  is_active: boolean
  sync_enabled: boolean
  sync_frequency: number
  folders_to_sync: string[]
}

interface EmailAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: EmailAccount | null
  onSuccess: () => void
}

export function EmailAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess
}: EmailAccountDialogProps) {
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    provider: 'microsoft' as 'microsoft' | 'google',
    sync_frequency: 30,
  })
  const supabase = createClient()

  // Check authentication when dialog opens
  useEffect(() => {
    if (open && !account) {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast({
            title: "Autenticação necessária",
            description: "Você precisa estar logado para adicionar uma conta de email",
            variant: "destructive",
          })
          onOpenChange(false)
          window.location.href = '/login?redirect=/emails'
        }
      }
      checkAuth()
    }
  }, [open, account, supabase, onOpenChange])

  useEffect(() => {
    if (account) {
      setFormData({
        email: account.email,
        provider: account.provider,
        sync_frequency: account.sync_frequency || 30,
      })
    } else {
      setFormData({
        email: '',
        provider: 'microsoft',
        sync_frequency: 30,
      })
    }
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (account?.id) {
      // Update existing account
      setLoading(true)
      try {
        const { error } = await supabase
          .from('email_accounts')
          .update({
            email: formData.email,
            sync_frequency: formData.sync_frequency,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Conta atualizada com sucesso",
        })
        onSuccess()
      } catch (error) {
        console.error('Error updating account:', error)
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a conta",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    } else {
      // OAuth flow for new account
      handleOAuthConnect()
    }
  }

  const handleOAuthConnect = async () => {
    setAuthLoading(true)
    
    try {
      if (formData.provider === 'microsoft') {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast({
            title: "Erro",
            description: "Você precisa estar logado",
            variant: "destructive",
          })
          setAuthLoading(false)
          return
        }
        
        // Store user ID in secure cookie
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        })
        
        // Store email in localStorage for callback
        localStorage.setItem('pending_email_account', JSON.stringify({
          email: formData.email,
          provider: formData.provider,
          sync_frequency: formData.sync_frequency,
          userId: session.user.id // Also store in localStorage as backup
        }))

        // Microsoft OAuth flow - Direct URL
        const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '7cf3681f-8f25-4099-8f42-51c2b7cb1b90'
        
        if (!clientId) {
          throw new Error('Microsoft Client ID não configurado')
        }
        
        console.log('Using Microsoft Client ID:', clientId)
        
        // Use the app URL from environment or current origin
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const redirectUri = `${baseUrl}/auth/callback/microsoft`
        const scope = 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read'
        const state = crypto.randomUUID()
        
        // Store state for security
        localStorage.setItem('oauth_state', state)
        
        // Usar URLSearchParams para garantir encoding correto
        const params = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          response_mode: 'query',
          scope: scope,
          state: state,
          prompt: 'consent'
        })
        
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
        
        console.log('Redirecting to:', authUrl)

        // Redirect to Microsoft login
        window.location.href = authUrl
      } else {
        // Google OAuth flow (future implementation)
        toast({
          title: "Em breve",
          description: "Integração com Gmail será implementada em breve",
          variant: "default",
        })
        setAuthLoading(false)
      }
    } catch (error) {
      console.error('Error with OAuth:', error)
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a autenticação",
        variant: "destructive",
      })
      setAuthLoading(false)
    }
  }

  const frequencyOptions = [
    { value: 5, label: "5 minutos" },
    { value: 15, label: "15 minutos" },
    { value: 30, label: "30 minutos" },
    { value: 60, label: "1 hora" },
    { value: 120, label: "2 horas" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Conta de Email' : 'Adicionar Conta de Email'}
          </DialogTitle>
          <DialogDescription>
            {account 
              ? 'Atualize as configurações da conta de email'
              : 'Conecte uma conta de email para capturar tickets automaticamente'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!account && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provedor</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value: 'microsoft' | 'google') => 
                      setFormData({ ...formData, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="microsoft">
                        <div className="flex items-center space-x-2">
                          <span>📧</span>
                          <span>Microsoft/Outlook</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="google" disabled>
                        <div className="flex items-center space-x-2">
                          <span>📨</span>
                          <span>Gmail (Em breve)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="sync_frequency">Frequência de Sincronização</Label>
              <Select
                value={formData.sync_frequency.toString()}
                onValueChange={(value) => 
                  setFormData({ ...formData, sync_frequency: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || authLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || authLoading}>
              {loading || authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {authLoading ? 'Conectando...' : 'Salvando...'}
                </>
              ) : (
                account ? 'Salvar' : 'Conectar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}