'use client'

import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionStatus() {
  const { isConnected } = useSupabaseRealtime()

  return (
    <Badge 
      variant={isConnected ? 'success' : 'secondary'}
      className="gap-1"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Tempo Real
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Conectando...
        </>
      )}
    </Badge>
  )
}