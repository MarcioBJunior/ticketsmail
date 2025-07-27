'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

function MicrosoftCallbackContent() {
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Prevent Supabase from auto-processing the callback
    const handleCallback = async () => {
      try {
        // Stop any Supabase auto-processing
        if (window.location.hash) {
          window.location.hash = ''
        }
        
        // Get the authorization code from URL
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        

        if (error) {
          throw new Error(errorDescription || error)
        }

        if (!code) {
          throw new Error('Código de autorização não encontrado')
        }

        // Verify state for security
        const savedState = localStorage.getItem('oauth_state')
        if (state !== savedState) {
          throw new Error('Invalid state parameter - possible CSRF attack')
        }

        // Exchange code for tokens using our API
        const response = await fetch('/api/auth/microsoft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Token exchange failed:', response.status, errorText)
          let error
          try {
            error = JSON.parse(errorText)
          } catch {
            error = { error: errorText }
          }
          throw new Error(error.error || 'Failed to exchange authorization code')
        }

        const data = await response.json()
        const { access_token, refresh_token, email, name, expires_in } = data

        // Get pending account info
        const pendingAccountStr = localStorage.getItem('pending_email_account')
        const pendingAccount = pendingAccountStr ? JSON.parse(pendingAccountStr) : null

        // Try to get session - but don't rely on it during OAuth callback
        let userId = null
        try {
          const { data: { session } } = await supabase.auth.getSession()
          userId = session?.user?.id
        } catch (error) {
          // Session might not be available during OAuth callback
        }
        
        // Get user ID from cookie or localStorage
        let storedUserId = pendingAccount?.userId || null
        
        if (!storedUserId) {
          // Try to get from API cookie
          try {
            const sessionRes = await fetch('/api/session')
            const sessionData = await sessionRes.json()
            storedUserId = sessionData.userId
          } catch (error) {
            // Cookie might not be available
          }
        }
        
        // Always store tokens temporarily - we'll process them on the emails page
        const tokensToSave = {
          access_token,
          refresh_token,
          email: pendingAccount?.email || email,
          name,
          sync_frequency: pendingAccount?.sync_frequency || 30,
          userId: storedUserId || userId, // Include any user ID we found
          expires_in
        }
        
        localStorage.setItem('pending_microsoft_tokens', JSON.stringify(tokensToSave))
        
        // Clean up OAuth state
        localStorage.removeItem('oauth_state')
        
        toast({
          title: "Conta Microsoft autorizada",
          description: "Redirecionando para finalizar a conexão...",
        })
        
        // Always redirect to emails page - it will handle the tokens
        router.push('/emails')
        return
      } catch (err: any) {
        console.error('Error in Microsoft callback:', err)
        setError(err.message || 'Erro ao conectar conta Microsoft')
        toast({
          title: "Erro",
          description: err.message || 'Não foi possível conectar a conta',
          variant: "destructive",
        })
      } finally {
        setProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, router, supabase])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Conectando conta Microsoft</CardTitle>
            <CardDescription>
              Aguarde enquanto processamos a autenticação...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro na autenticação</CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <a href="/emails" className="text-primary hover:underline">
              Voltar para contas de email
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function MicrosoftCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processando...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    }>
      <MicrosoftCallbackContent />
    </Suspense>
  )
}