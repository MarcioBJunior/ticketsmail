'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ConnectionStatus } from '@/components/realtime/connection-status'

interface UserProfile {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'collaborator'
}

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        try {
          const response = await fetch('/api/users/profile')
          const data = await response.json()
          
          if (data.profile) {
            setProfile(data.profile)
          }
        } catch (error) {
          console.error('Error creating user profile:', error)
        }
      } else if (profile) {
        setProfile(profile)
      }
      
      setLoading(false)
    }
    
    checkAuth()
  }, [router, supabase])

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p>Carregando...</p>
    </div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-xl font-semibold">Sistema de Tickets</h1>
          <div className="ml-auto flex items-center space-x-4">
            <ConnectionStatus />
            <NotificationBell />
            <span className="text-sm text-muted-foreground">
              {profile?.name || user.email}
            </span>
            {profile?.role === 'admin' && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                Admin
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background">
          <div className="p-4">
            <DashboardNav />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}