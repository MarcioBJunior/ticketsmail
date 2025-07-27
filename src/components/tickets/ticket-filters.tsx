'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Search, 
  Filter, 
  X, 
  CalendarIcon,
  RefreshCw 
} from 'lucide-react'

interface TicketFiltersProps {
  onFiltersChange?: (filters: any) => void
}

export function TicketFilters({ onFiltersChange }: TicketFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all')
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assigned_to') || 'all')
  const [emailAccount, setEmailAccount] = useState(searchParams.get('email_account') || 'all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Options data
  const [users, setUsers] = useState<any[]>([])
  const [emailAccounts, setEmailAccounts] = useState<any[]>([])
  
  useEffect(() => {
    loadFilterOptions()
  }, [])
  
  const loadFilterOptions = async () => {
    // Load users
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name')
    
    if (usersData) setUsers(usersData)
    
    // Load email accounts
    const { data: accountsData } = await supabase
      .from('email_accounts')
      .select('id, email, provider')
      .eq('is_active', true)
      .order('email')
    
    if (accountsData) setEmailAccounts(accountsData)
  }

  const activeFiltersCount = [
    search,
    status !== 'all',
    priority !== 'all',
    assignedTo !== 'all',
    emailAccount !== 'all',
    dateFrom,
    dateTo
  ].filter(Boolean).length

  const applyFilters = () => {
    setIsLoading(true)
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (priority !== 'all') params.set('priority', priority)
    if (assignedTo !== 'all') params.set('assigned_to', assignedTo)
    if (emailAccount !== 'all') params.set('email_account', emailAccount)
    if (dateFrom) params.set('from', format(dateFrom, 'yyyy-MM-dd'))
    if (dateTo) params.set('to', format(dateTo, 'yyyy-MM-dd'))
    
    router.push(`/tickets?${params.toString()}`)
    
    if (onFiltersChange) {
      onFiltersChange({
        search,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        assignedTo: assignedTo !== 'all' ? assignedTo : undefined,
        emailAccount: emailAccount !== 'all' ? emailAccount : undefined,
        dateFrom,
        dateTo
      })
    }
    
    setIsLoading(false)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setPriority('all')
    setAssignedTo('all')
    setEmailAccount('all')
    setDateFrom(undefined)
    setDateTo(undefined)
    router.push('/tickets')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, assunto ou remetente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="default" disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            'Buscar'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 px-1.5 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="waiting_response">Aguardando Resposta</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Responsável</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="assignedTo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Account Filter */}
            <div className="space-y-2">
              <Label htmlFor="emailAccount">Conta de Email</Label>
              <Select value={emailAccount} onValueChange={setEmailAccount}>
                <SelectTrigger id="emailAccount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {emailAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.email} ({account.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? (
                      format(dateFrom, "dd/MM/yyyy")
                    ) : (
                      "Selecionar data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? (
                      format(dateTo, "dd/MM/yyyy")
                    ) : (
                      "Selecionar data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ptBR}
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button onClick={applyFilters} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                'Aplicar Filtros'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1">
              Busca: {search}
              <button
                onClick={() => {
                  setSearch('')
                  applyFilters()
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {status}
              <button
                onClick={() => {
                  setStatus('all')
                  applyFilters()
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {priority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Prioridade: {priority}
              <button
                onClick={() => {
                  setPriority('all')
                  applyFilters()
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="gap-1">
              De: {format(dateFrom, "dd/MM/yyyy")}
              <button
                onClick={() => {
                  setDateFrom(undefined)
                  applyFilters()
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="gap-1">
              Até: {format(dateTo, "dd/MM/yyyy")}
              <button
                onClick={() => {
                  setDateTo(undefined)
                  applyFilters()
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}