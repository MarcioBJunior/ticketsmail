-- TicketsMail Database Schema
-- Complete schema for Supabase deployment

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" SCHEMA extensions;

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'collaborator');
CREATE TYPE ticket_status AS ENUM ('new', 'in_progress', 'waiting_response', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE email_provider AS ENUM ('microsoft', 'google');
CREATE TYPE interaction_type AS ENUM ('comment', 'email_reply');
CREATE TYPE notification_type AS ENUM ('ticket_created', 'ticket_assigned', 'ticket_updated', 'new_interaction', 'status_changed');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'collaborator',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create email_accounts table
CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider email_provider NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  folders_to_sync TEXT[] DEFAULT ARRAY['Inbox']::TEXT[],
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_frequency INTEGER NOT NULL DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  sender_filters TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, provider)
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  email_message_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  sla_deadline TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(email_account_id, email_message_id)
);

-- Create ticket_interactions table
CREATE TABLE public.ticket_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type interaction_type NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES public.ticket_interactions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_id UUID,
    entity_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_email_account ON public.tickets(email_account_id);
CREATE INDEX idx_ticket_interactions_ticket_id ON public.ticket_interactions(ticket_id);
CREATE INDEX idx_attachments_ticket_id ON public.attachments(ticket_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read);
CREATE INDEX idx_email_accounts_user_id ON public.email_accounts(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  -- Get current year and month
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get the next sequence number for this month
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.tickets
  WHERE ticket_number LIKE year_month || '%';
  
  -- Generate ticket number format: YYYYMM-NNNN
  ticket_num := year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to sync auth users
CREATE OR REPLACE FUNCTION sync_auth_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email) as name
  FROM auth.users au
  LEFT JOIN public.users u ON u.id = au.id
  WHERE u.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for email_accounts
CREATE POLICY "Users can view their own email accounts" ON public.email_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts" ON public.email_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts" ON public.email_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tickets
CREATE POLICY "Authenticated users can view all tickets" ON public.tickets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tickets" ON public.tickets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for ticket_interactions
CREATE POLICY "Authenticated users can view all interactions" ON public.ticket_interactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create interactions" ON public.ticket_interactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- RLS Policies for attachments
CREATE POLICY "Authenticated users can view all attachments" ON public.attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create attachments" ON public.attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  false,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
  );

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Initial data: sync existing auth users
SELECT sync_auth_users();