# Arquitetura do Sistema

## Vis�o Geral
Sistema de gest�o de tickets que converte e-mails em tickets organizados, com funcionalidades completas de acompanhamento, intera��o e gest�o.

## Stack Tecnol�gico
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + Componentes customizados (baseados em Radix UI)
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autentica��o**: Supabase Auth
- **Storage**: Supabase Storage
- **APIs Externas**: Microsoft Graph API, Gmail API

## Estrutura de Componentes

### Layout Components
- `RootLayout`: Layout principal da aplica��o
- `DashboardLayout`: Layout espec�fico do dashboard
- `AuthLayout`: Layout para p�ginas de autentica��o

### Feature Components
- `TicketList`: Lista de tickets com filtros
- `TicketDetail`: Visualiza��o detalhada do ticket
- `TicketInteraction`: Sistema de respostas e coment�rios
- `EmailCapture`: Configura��o de captura de e-mails
- `UserManagement`: Gest�o de colaboradores

### UI Components
- Componentes base reutiliz�veis (bot�es, forms, modals, etc.)
- Baseados em Radix UI com styling customizado

## Fluxo de Dados
1. **Captura de E-mails**: Cron job verifica e-mails periodicamente
2. **Processamento**: API converte e-mails em tickets
3. **Armazenamento**: Tickets salvos no Supabase
4. **Notifica��o**: Sistema notifica respons�veis
5. **Intera��o**: Respostas enviadas via API de e-mail

## Seguran�a
- OAuth2 para todas as integra��es de e-mail
- Row Level Security (RLS) no Supabase
- Valida��o de dados em todas as APIs
- Sanitiza��o de conte�do HTML dos e-mails