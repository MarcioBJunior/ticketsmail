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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { Loader2, Plus, X } from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  provider: 'microsoft' | 'google'
  sync_enabled: boolean
  sync_frequency: number
  folders_to_sync: string[]
  sender_filters?: string[]
  subject_filters?: string[]
}

interface EmailSyncSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: EmailAccount
  onSuccess: () => void
}

const DEFAULT_FOLDERS = {
  microsoft: ['Inbox', 'Sent Items', 'Important'],
  google: ['INBOX', 'Sent', 'Important']
}

export function EmailSyncSettings({
  open,
  onOpenChange,
  account,
  onSuccess
}: EmailSyncSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sync_enabled: true,
    folders_to_sync: [] as string[],
    sender_filters: [] as string[],
    subject_filters: [] as string[],
  })
  const [newSenderFilter, setNewSenderFilter] = useState('')
  const [newSubjectFilter, setNewSubjectFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (account) {
      setFormData({
        sync_enabled: account.sync_enabled ?? true,
        folders_to_sync: account.folders_to_sync || [],
        sender_filters: account.sender_filters || [],
        subject_filters: account.subject_filters || [],
      })
    }
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({
          sync_enabled: formData.sync_enabled,
          folders_to_sync: formData.folders_to_sync,
          sender_filters: formData.sender_filters,
          subject_filters: formData.subject_filters,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Configurações de sincronização atualizadas",
      })
      onSuccess()
    } catch (error) {
      console.error('Error updating sync settings:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folder: string) => {
    setFormData(prev => ({
      ...prev,
      folders_to_sync: prev.folders_to_sync.includes(folder)
        ? prev.folders_to_sync.filter(f => f !== folder)
        : [...prev.folders_to_sync, folder]
    }))
  }

  const addSenderFilter = () => {
    if (newSenderFilter && !formData.sender_filters.includes(newSenderFilter)) {
      setFormData(prev => ({
        ...prev,
        sender_filters: [...prev.sender_filters, newSenderFilter]
      }))
      setNewSenderFilter('')
    }
  }

  const removeSenderFilter = (filter: string) => {
    setFormData(prev => ({
      ...prev,
      sender_filters: prev.sender_filters.filter(f => f !== filter)
    }))
  }

  const addSubjectFilter = () => {
    if (newSubjectFilter && !formData.subject_filters.includes(newSubjectFilter)) {
      setFormData(prev => ({
        ...prev,
        subject_filters: [...prev.subject_filters, newSubjectFilter]
      }))
      setNewSubjectFilter('')
    }
  }

  const removeSubjectFilter = (filter: string) => {
    setFormData(prev => ({
      ...prev,
      subject_filters: prev.subject_filters.filter(f => f !== filter)
    }))
  }

  const availableFolders = DEFAULT_FOLDERS[account.provider] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações de Sincronização</DialogTitle>
          <DialogDescription>
            Configure como os emails serão sincronizados para {account.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-enabled" className="cursor-pointer">
                <div>
                  <p className="font-medium">Sincronização Automática</p>
                  <p className="text-sm text-muted-foreground">
                    Verificar novos emails periodicamente
                  </p>
                </div>
              </Label>
              <Switch
                id="sync-enabled"
                checked={formData.sync_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, sync_enabled: checked })
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Pastas para Sincronizar</Label>
              <div className="space-y-2">
                {availableFolders.map(folder => (
                  <div key={folder} className="flex items-center space-x-2">
                    <Checkbox
                      id={folder}
                      checked={formData.folders_to_sync.includes(folder)}
                      onCheckedChange={() => toggleFolder(folder)}
                    />
                    <Label 
                      htmlFor={folder} 
                      className="cursor-pointer font-normal"
                    >
                      {folder}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Filtros de Remetente</Label>
              <p className="text-sm text-muted-foreground">
                Capturar apenas emails destes remetentes (deixe vazio para todos)
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="exemplo@empresa.com"
                  value={newSenderFilter}
                  onChange={(e) => setNewSenderFilter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSenderFilter())}
                />
                <Button type="button" onClick={addSenderFilter} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.sender_filters.map(filter => (
                  <Badge key={filter} variant="secondary" className="pr-1">
                    {filter}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => removeSenderFilter(filter)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Filtros de Assunto</Label>
              <p className="text-sm text-muted-foreground">
                Capturar apenas emails contendo estas palavras no assunto
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="urgente, importante, etc"
                  value={newSubjectFilter}
                  onChange={(e) => setNewSubjectFilter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubjectFilter())}
                />
                <Button type="button" onClick={addSubjectFilter} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.subject_filters.map(filter => (
                  <Badge key={filter} variant="secondary" className="pr-1">
                    {filter}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => removeSubjectFilter(filter)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}