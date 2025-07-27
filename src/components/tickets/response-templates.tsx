'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'
import { FileText, Plus, Edit, Trash2, Copy } from 'lucide-react'

interface Template {
  id: string
  name: string
  subject: string
  content: string
  category: string
  created_at: string
  updated_at: string
}

interface ResponseTemplatesProps {
  onSelectTemplate?: (template: Template) => void
  showManagement?: boolean
}

export function ResponseTemplates({ onSelectTemplate, showManagement = false }: ResponseTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'general'
  })
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('response_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('response_templates')
          .update(formData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast({
          title: 'Sucesso',
          description: 'Template atualizado com sucesso'
        })
      } else {
        const { error } = await supabase
          .from('response_templates')
          .insert(formData)

        if (error) throw error
        toast({
          title: 'Sucesso',
          description: 'Template criado com sucesso'
        })
      }

      setDialogOpen(false)
      fetchTemplates()
      resetForm()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return

    try {
      const { error } = await supabase
        .from('response_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({
        title: 'Sucesso',
        description: 'Template excluído com sucesso'
      })
      fetchTemplates()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o template',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      content: '',
      category: 'general'
    })
    setEditingTemplate(null)
  }

  const categories = {
    general: 'Geral',
    support: 'Suporte',
    billing: 'Financeiro',
    technical: 'Técnico',
    followup: 'Acompanhamento'
  }

  const replaceVariables = (text: string) => {
    // Add more variables as needed
    const variables = {
      '{{customer_name}}': 'Nome do Cliente',
      '{{ticket_id}}': 'ID do Ticket',
      '{{date}}': new Date().toLocaleDateString('pt-BR'),
      '{{agent_name}}': 'Nome do Agente'
    }

    let result = text
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'g'), value)
    })
    return result
  }

  if (loading) {
    return <div>Carregando templates...</div>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Resposta</CardTitle>
              <CardDescription>
                Respostas padronizadas para agilizar o atendimento
              </CardDescription>
            </div>
            {showManagement && (
              <Button onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categories).map(([key, label]) => {
              const categoryTemplates = templates.filter(t => t.category === key)
              if (categoryTemplates.length === 0) return null

              return (
                <div key={key}>
                  <h3 className="font-semibold mb-2">{label}</h3>
                  <div className="grid gap-2">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => onSelectTemplate?.(template)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {template.subject}
                            </p>
                          </div>
                        </div>
                        {showManagement && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingTemplate(template)
                                setFormData({
                                  name: template.name,
                                  subject: template.subject,
                                  content: template.content,
                                  category: template.category
                                })
                                setDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {onSelectTemplate && (
                          <Button size="sm" variant="outline">
                            <Copy className="h-4 w-4 mr-2" />
                            Usar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Crie ou edite um template de resposta. Use variáveis como {`{{customer_name}}`} que serão substituídas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Categoria
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Assunto
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Conteúdo
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="col-span-3"
                rows={6}
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground">
              <p>Variáveis disponíveis:</p>
              <code>{`{{customer_name}}, {{ticket_id}}, {{date}}, {{agent_name}}`}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}