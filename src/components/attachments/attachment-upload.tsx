'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttachmentUploadProps {
  ticketId: string
  interactionId?: string
  onUploadComplete?: (attachment: any) => void
  maxFileSize?: number // in MB
  acceptedFileTypes?: string[]
}

export function AttachmentUpload({
  ticketId,
  interactionId,
  onUploadComplete,
  maxFileSize = 10, // 10MB default
  acceptedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt']
}: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).filter(file => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [file.name]: `Arquivo muito grande. Máximo: ${maxFileSize}MB`
        }))
        return false
      }
      return true
    })
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fileName]
      return newErrors
    })
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileName]
      return newProgress
    })
  }

  const uploadFile = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${ticketId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, file, {
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100
          setUploadProgress(prev => ({ ...prev, [file.name]: percentage }))
        }
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName)

    // Save attachment record in database
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        ticket_id: ticketId,
        interaction_id: interactionId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        mime_type: file.type,
        storage_path: fileName,
        url: publicUrl,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      // If database insert fails, delete the uploaded file
      await supabase.storage
        .from('ticket-attachments')
        .remove([fileName])
      throw dbError
    }

    return attachment
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    for (const file of files) {
      try {
        const attachment = await uploadFile(file)
        
        // Remove from local files list
        setFiles(prev => prev.filter(f => f.name !== file.name))
        
        // Call callback if provided
        if (onUploadComplete) {
          onUploadComplete(attachment)
        }
      } catch (error) {
        console.error('Upload error:', error)
        setErrors(prev => ({
          ...prev,
          [file.name]: 'Erro ao fazer upload do arquivo'
        }))
      }
    }
    
    setIsUploading(false)
    setUploadProgress({})
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-1">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-xs text-gray-500">
          Máximo {maxFileSize}MB por arquivo
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.name} className="p-3">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  {errors[file.name] && (
                    <p className="text-xs text-red-500 mt-1">{errors[file.name]}</p>
                  )}
                  {uploadProgress[file.name] !== undefined && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${uploadProgress[file.name]}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.name)
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar {files.length} arquivo{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}