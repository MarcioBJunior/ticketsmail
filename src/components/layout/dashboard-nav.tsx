'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  Settings,
  Ticket
} from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Tickets',
    href: '/tickets',
    icon: Ticket,
  },
  {
    title: 'Contas de E-mail',
    href: '/emails',
    icon: Mail,
  },
  {
    title: 'Colaboradores',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                isActive && 'bg-secondary'
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          </Link>
        )
      })}
    </nav>
  )
}