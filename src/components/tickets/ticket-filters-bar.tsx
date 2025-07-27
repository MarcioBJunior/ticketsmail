'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Filter } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface TicketFiltersBarProps {
  onClose: () => void
  onApply: () => void
}

export function TicketFiltersBar({ onClose, onApply }: TicketFiltersBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    priority: searchParams.get('priority') || 'all',
    assigned_to: searchParams.get('assigned_to') || 'all',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || ''
  })

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      }
    })

    const search = searchParams.get('search')
    if (search) params.set('search', search)

    router.push(`/tickets?${params.toString()}`)
    onApply()
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    const search = searchParams.get('search')
    if (search) params.set('search', search)
    
    router.push(`/tickets?${params.toString()}`)
    onApply()
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
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
          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters({ ...filters, priority: value })}
          >
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

        {/* Assignment Filter */}
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Atribuição</Label>
          <Select
            value={filters.assigned_to}
            onValueChange={(value) => setFilters({ ...filters, assigned_to: value })}
          >
            <SelectTrigger id="assigned_to">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="me">Meus Tickets</SelectItem>
              <SelectItem value="unassigned">Não Atribuídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label htmlFor="from">De</Label>
          <Input
            id="from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label htmlFor="to">Até</Label>
          <Input
            id="to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={clearFilters}
        >
          Limpar Filtros
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button onClick={applyFilters}>
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </Card>
  )
}