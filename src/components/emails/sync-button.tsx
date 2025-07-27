'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface SyncButtonProps {
  accountId: string
  accountEmail: string
}

export function SyncButton({ accountId, accountEmail }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setIsSyncing(true)
    
    try {
      const response = await fetch(`/api/emails/sync/${accountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      toast({
        title: 'Sincronização concluída',
        description: data.message || 'Emails sincronizados com sucesso',
      })
      
      console.log('Sincronização concluída:', data.summary)

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Erro ao sincronizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sincronizando...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sincronizar
        </>
      )}
    </Button>
  )
}