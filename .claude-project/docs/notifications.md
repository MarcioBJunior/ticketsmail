# Sistema de Notificações

## Status: Implementado (Aguardando Migração)

O sistema de notificações foi completamente implementado e está pronto para uso. Inclui:

## Funcionalidades Implementadas

### 1. Estrutura de Banco de Dados
- Tabela `notifications` para armazenar notificações
- Tabela `notification_preferences` para preferências do usuário
- Triggers automáticos para criar notificações em eventos:
  - Ticket atribuído
  - Status alterado
  - Nova interação
  - Prioridade alterada

### 2. Interface de Usuário
- **NotificationBell**: Componente no header que mostra notificações em tempo real
- **Página de Notificações**: Gerenciamento completo de notificações e preferências
- **Toast Notifications**: Sistema de notificações temporárias

### 3. Tipos de Notificações

#### In-App (Sistema)
- Badge com contador de não lidas
- Lista dropdown com notificações recentes
- Página dedicada com histórico completo
- Atualização em tempo real via Supabase Realtime

#### Email (Futuro)
- Estrutura preparada para envio de emails
- Preferências configuráveis por tipo de notificação

### 4. Preferências Personalizáveis
Cada usuário pode configurar:
- Notificações in-app (ativar/desativar por tipo)
- Notificações por email (preparado para implementação futura)
- Tipos configuráveis:
  - Ticket atribuído
  - Ticket atualizado
  - Nova interação
  - Status alterado
  - Prioridade alterada
  - Menções

## Arquivos Criados

### Backend
- `/supabase/migrations/20240101000003_add_notifications.sql` - Migração do banco de dados

### Frontend
- `/src/components/notifications/notification-bell.tsx` - Componente do sino de notificações
- `/src/app/notifications/page.tsx` - Página de gerenciamento de notificações
- `/src/components/ui/switch.tsx` - Componente de toggle
- `/src/components/ui/tabs.tsx` - Componente de abas
- `/src/components/ui/scroll-area.tsx` - Área com scroll
- `/src/hooks/use-toast.ts` - Hook para toast notifications

## Pendências

### 1. Aplicar Migração
A migração SQL precisa ser executada no banco de dados Supabase:
```bash
# Executar o conteúdo de /supabase/migrations/20240101000003_add_notifications.sql
# no SQL Editor do Supabase Dashboard
```

### 2. Integração de Email (Futuro)
- Configurar serviço de envio de email (SendGrid, Resend, etc.)
- Implementar templates de email
- Criar workers para envio assíncrono

## Como Usar

### Para o Usuário
1. Clique no ícone de sino no header para ver notificações
2. Acesse `/notifications` para gerenciar preferências
3. Configure quais tipos de notificações deseja receber

### Para Desenvolvedores
```typescript
// Criar notificação manualmente
await supabase.rpc('create_notification', {
  p_user_id: userId,
  p_ticket_id: ticketId,
  p_type: 'ticket_assigned',
  p_title: 'Novo ticket atribuído',
  p_message: 'O ticket #123 foi atribuído a você',
  p_metadata: { extra: 'data' }
})

// Marcar como lida
await supabase.rpc('mark_notification_read', {
  p_notification_id: notificationId
})
```

## Segurança
- Notificações são filtradas por usuário (RLS aplicado)
- Preferências são individuais por usuário
- Triggers respeitam preferências antes de criar notificações