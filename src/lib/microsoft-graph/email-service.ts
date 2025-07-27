import { Client } from '@microsoft/microsoft-graph-client'
import { Message, MailFolder } from '@microsoft/microsoft-graph-types'
import { createUserGraphClient } from './client'

export interface EmailFilter {
  folders?: string[]
  senders?: string[]
  startDate?: Date
  endDate?: Date
  hasAttachments?: boolean
}

export class MicrosoftEmailService {
  private client: Client
  private excludedFolderIdsCache: string[] | null = null

  constructor(accessToken: string) {
    this.client = createUserGraphClient(accessToken)
  }
  
  // Getter to access client for testing
  get graphClient() {
    return this.client
  }

  // Get user's email folders
  async getFolders(): Promise<MailFolder[]> {
    try {
      const response = await this.client
        .api('/me/mailFolders')
        .select('id,displayName,totalItemCount,unreadItemCount')
        .get()

      return response.value || []
    } catch (error) {
      throw error
    }
  }

  // Get emails from specific folders with filters
  async getEmails(filter: EmailFilter): Promise<Message[]> {
    try {
      let query = this.client
        .api('/me/messages')
        .select('id,subject,bodyPreview,from,receivedDateTime,hasAttachments,importance,isRead,parentFolderId')
        .orderby('receivedDateTime desc')
        .top(50)

      // Build filter query
      const filters: string[] = []

      // Filter by date range
      if (filter.startDate) {
        filters.push(`receivedDateTime ge ${filter.startDate.toISOString()}`)
      }
      if (filter.endDate) {
        filters.push(`receivedDateTime le ${filter.endDate.toISOString()}`)
      }

      // Filter by has attachments
      if (filter.hasAttachments !== undefined) {
        filters.push(`hasAttachments eq ${filter.hasAttachments}`)
      }

      // Apply filters
      if (filters.length > 0) {
        query = query.filter(filters.join(' and '))
      }

      const response = await query.get()
      let emails = response.value || []

      // Get list of folders to exclude (junk, deleted items, etc)
      const excludedFolders = await this.getExcludedFolderIds()

      // Filter out emails from excluded folders
      emails = emails.filter((email: any) => {
        // Check if parentFolderId is in excluded folders
        return !excludedFolders.includes(email.parentFolderId)
      })

      // Filter by folders (if specified)
      if (filter.folders && filter.folders.length > 0) {
        // Get emails from specific folders
        const folderEmails = await Promise.all(
          filter.folders.map(folderId => 
            this.getEmailsFromFolder(folderId, filters.join(' and '))
          )
        )
        emails = folderEmails.flat()
      }

      // Filter by senders (client-side filtering)
      if (filter.senders && filter.senders.length > 0) {
        emails = emails.filter((email: any) => 
          filter.senders!.some(sender => 
            email.from?.emailAddress?.address?.toLowerCase().includes(sender.toLowerCase())
          )
        )
      }

      return emails
    } catch (error) {
      throw error
    }
  }

  // Get emails from a specific folder
  private async getEmailsFromFolder(folderId: string, filter?: string): Promise<Message[]> {
    try {
      // Handle special folder names
      const folderPath = folderId.toLowerCase() === 'inbox' ? 'inbox' : folderId
      
      let query = this.client
        .api(`/me/mailFolders/${folderPath}/messages`)
        .select('id,subject,bodyPreview,from,receivedDateTime,hasAttachments,importance,isRead')
        .orderby('receivedDateTime desc')
        .top(50)

      if (filter) {
        query = query.filter(filter)
      }

      const response = await query.get()
      return response.value || []
    } catch (error: any) {
      return []
    }
  }

  // Get full email details
  async getEmailDetails(messageId: string): Promise<Message> {
    try {
      const email = await this.client
        .api(`/me/messages/${messageId}`)
        .select('id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,importance,isRead,conversationId')
        .get()

      return email
    } catch (error) {
      throw error
    }
  }

  // Get email attachments
  async getAttachments(messageId: string): Promise<any[]> {
    try {
      const response = await this.client
        .api(`/me/messages/${messageId}/attachments`)
        .get()

      return response.value || []
    } catch (error) {
      throw error
    }
  }

  // Send email reply
  async sendReply(messageId: string, replyContent: string): Promise<void> {
    try {
      // Method 1: Try direct reply endpoint first
      try {
        await this.client
          .api(`/me/messages/${messageId}/reply`)
          .post({
            message: {
              body: {
                contentType: 'Text',
                content: replyContent
              }
            }
          })
        return // Success!
      } catch (replyError: any) {
        // Direct reply failed, try alternative method
      }

      // Method 2: Get original message and send as new email
      const originalMessage = await this.client
        .api(`/me/messages/${messageId}`)
        .select('conversationId,from,subject,toRecipients')
        .get()
      
      const newMessage = {
        subject: originalMessage.subject.startsWith('Re:') 
          ? originalMessage.subject 
          : `Re: ${originalMessage.subject}`,
        body: {
          contentType: 'Text',
          content: replyContent
        },
        toRecipients: [originalMessage.from],
        conversationId: originalMessage.conversationId
      }

      try {
        await this.client
          .api('/me/sendMail')
          .post({
            message: newMessage,
            saveToSentItems: true
          })
        return // Success!
      } catch (sendError: any) {
        // SendMail failed, try draft method
      }

      // Method 3: Create and send a draft
      const draft = await this.client
        .api('/me/messages')
        .post(newMessage)
      
      await this.client
        .api(`/me/messages/${draft.id}/send`)
        .post({})
        
    } catch (error: any) {
      throw error
    }
  }

  // Mark email as read
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${messageId}`)
        .patch({ isRead: true })
    } catch (error) {
      throw error
    }
  }

  // Create a ticket from an email
  async convertToTicket(messageId: string): Promise<Message> {
    const email = await this.getEmailDetails(messageId)
    await this.markAsRead(messageId)
    return email
  }

  // Get IDs of folders to exclude from sync (Junk, Deleted Items, etc)
  private async getExcludedFolderIds(): Promise<string[]> {
    // Return cached result if available
    if (this.excludedFolderIdsCache) {
      return this.excludedFolderIdsCache
    }

    try {
      const folders = await this.getFolders()
      const excludedFolderNames = [
        'junkemail',
        'junk email',
        'junk',
        'spam',
        'deleted items',
        'deleteditems',
        'trash',
        'lixeira',
        'lixo eletrônico',
        'drafts',
        'rascunhos',
        'sent items',
        'sentitems',
        'itens enviados'
      ]
      
      // Find folders that match excluded names
      const excludedIds = folders
        .filter(folder => {
          const folderNameLower = folder.displayName?.toLowerCase() || ''
          return excludedFolderNames.some(excluded => 
            folderNameLower.includes(excluded) || 
            folderNameLower === excluded
          )
        })
        .map(folder => folder.id)
        .filter((id): id is string => id !== undefined)
      
      // Cache the result
      this.excludedFolderIdsCache = excludedIds
      
      return excludedIds
    } catch (error) {
      return []
    }
  }
}