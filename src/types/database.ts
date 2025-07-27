export interface IUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'collaborator'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IEmailAccount {
  id: string
  user_id: string
  provider: 'microsoft' | 'google'
  email: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  folders_to_watch: string[]
  sender_filters: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ITicket {
  id: string
  ticket_number: string
  email_account_id: string
  email_message_id: string
  subject: string
  description: string
  from_email: string
  from_name: string
  status: TicketStatusType
  priority: TicketPriorityType
  assigned_to?: string
  created_at: string
  updated_at: string
  closed_at?: string
  metadata?: Record<string, any>
}

export interface ITicketInteraction {
  id: string
  ticket_id: string
  user_id: string
  type: 'comment' | 'email_reply'
  content: string
  is_internal: boolean
  created_at: string
  metadata?: Record<string, any>
}

export interface IAttachment {
  id: string
  ticket_id: string
  interaction_id?: string
  filename: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
}

export interface IAuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  changes?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type TicketStatusType = 'new' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed'
export type TicketPriorityType = 'low' | 'medium' | 'high' | 'urgent'

export interface IDashboardMetrics {
  total_tickets: number
  new_tickets: number
  in_progress_tickets: number
  resolved_tickets: number
  average_resolution_time: number
  tickets_by_priority: Record<TicketPriorityType, number>
  tickets_by_status: Record<TicketStatusType, number>
  top_assignees: Array<{
    user_id: string
    name: string
    ticket_count: number
  }>
}