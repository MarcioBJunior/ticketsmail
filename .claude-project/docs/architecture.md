# Arquitetura do Sistema

## Visão Geral
Sistema de gestão de tickets que converte e-mails em tickets organizados, com funcionalidades completas de acompanhamento, interação e gestão.

## Stack Tecnológico
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + Componentes customizados (baseados em Radix UI)
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage
- **APIs Externas**: Microsoft Graph API, Gmail API

## Estrutura de Componentes

### Layout Components
- `RootLayout`: Layout principal da aplicação
- `DashboardLayout`: Layout específico do dashboard
- `AuthLayout`: Layout para páginas de autenticação

### Feature Components
- `TicketList`: Lista de tickets com filtros
- `TicketDetail`: Visualização detalhada do ticket
- `TicketInteraction`: Sistema de respostas e comentários
- `EmailCapture`: Configuração de captura de e-mails
- `UserManagement`: Gestão de colaboradores

### UI Components
- Componentes base reutilizáveis (botões, forms, modals, etc.)
- Baseados em Radix UI com styling customizado

## Fluxo de Dados
1. **Captura de E-mails**: Cron job verifica e-mails periodicamente
2. **Processamento**: API converte e-mails em tickets
3. **Armazenamento**: Tickets salvos no Supabase
4. **Notificação**: Sistema notifica responsáveis
5. **Interação**: Respostas enviadas via API de e-mail

## Segurança
- OAuth2 para todas as integrações de e-mail
- Row Level Security (RLS) no Supabase
- Validação de dados em todas as APIs
- Sanitização de conteúdo HTML dos e-mails