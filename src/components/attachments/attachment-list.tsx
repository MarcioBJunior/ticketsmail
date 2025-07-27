'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  Download, 
  Trash2, 
  Eye,
  Loader2 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Attachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  url: string
  created_at: string
  uploaded_by?: string
  users?: {
    name: string
    email: string
  }
}

interface AttachmentListProps {
  attachments: Attachment[]
  canDelete?: boolean
  onDelete?: (attachmentId: string) => void
}

export function AttachmentList({ 
  attachments, 
  canDelete = false,
  onDelete
}: AttachmentListProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage
    if (fileType.startsWith('video/')) return FileVideo
    if (fileType.startsWith('audio/')) return FileAudio
    if (fileType.includes('pdf')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id)
    
    try {
      // For public URLs, just open in new tab
      if (attachment.url.startsWith('http')) {
        window.open(attachment.url, '_blank')
      } else {
        // For storage paths, get download URL
        const { data, error } = await supabase.storage
          .from('ticket-attachments')
          .download(attachment.url)
        
        if (error) throw error
        
        // Create blob URL and download
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.file_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!canDelete || !onDelete) return
    
    setDeleting(attachment.id)
    
    try {
      // Delete from storage
      if (!attachment.url.startsWith('http')) {
        await supabase.storage
          .from('ticket-attachments')
          .remove([attachment.url])
      }
      
      // Delete from database
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)
      
      if (error) throw error
      
      // Call callback
      onDelete(attachment.id)
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setDeleting(null)
    }
  }

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/')
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum anexo</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        const FileIcon = getFileIcon(attachment.file_type)
        const isImage = isImageFile(attachment.file_type)
        
        return (
          <Card key={attachment.id} className="p-3">
            <div className="flex items-center space-x-3">
              <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.file_size)} • 
                  {attachment.users?.name || 'Sistema'} • 
                  {formatDistanceToNow(new Date(attachment.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </p>
              </div>
              
              <div className="flex items-center space-x-1">
                {isImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(attachment.url, '_blank')}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(attachment)}
                  disabled={downloading === attachment.id}
                  title="Baixar"
                >
                  {downloading === attachment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(attachment)}
                    disabled={deleting === attachment.id}
                    title="Excluir"
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}