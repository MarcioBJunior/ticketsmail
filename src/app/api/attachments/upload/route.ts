import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ticketId = formData.get('ticketId') as string
    const interactionId = formData.get('interactionId') as string | null

    if (!file || !ticketId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 })
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${ticketId}/${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file',
        details: uploadError.message 
      }, { status: 500 })
    }

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
      
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save attachment record',
        details: dbError.message 
      }, { status: 500 })
    }

    // Log the upload
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'attachment_uploaded',
      entity_type: 'attachment',
      entity_id: attachment.id,
      details: {
        ticket_id: ticketId,
        file_name: file.name,
        file_size: file.size
      }
    })

    return NextResponse.json({ 
      success: true, 
      attachment 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json({ 
        error: 'Attachment ID required' 
      }, { status: 400 })
    }

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*, tickets!inner(id)')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ 
        error: 'Attachment not found' 
      }, { status: 404 })
    }

    // Check permission (user must be uploader or admin)
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (attachment.uploaded_by !== user.id && userProfile?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Permission denied' 
      }, { status: 403 })
    }

    // Delete from storage
    if (attachment.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('ticket-attachments')
        .remove([attachment.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete attachment',
        details: deleteError.message 
      }, { status: 500 })
    }

    // Log the deletion
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'attachment_deleted',
      entity_type: 'attachment',
      entity_id: attachmentId,
      details: {
        ticket_id: attachment.ticket_id,
        file_name: attachment.file_name
      }
    })

    return NextResponse.json({ 
      success: true 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}