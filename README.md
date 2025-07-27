# TicketsMail - Sistema de Gestão de Tickets via Email

Um sistema completo para transformar emails em tickets organizados, com integração Microsoft Outlook/Exchange e interface moderna.

## 🚀 Funcionalidades

- **📧 Integração com Email**: Sincronização automática com Microsoft Outlook/Exchange
- **🎫 Gestão de Tickets**: Conversão automática de emails em tickets organizados
- **💬 Sistema de Respostas**: Responda tickets diretamente pelo sistema
- **👥 Gestão de Usuários**: Sistema completo de autenticação e autorização
- **📊 Dashboard Analítico**: Métricas em tempo real e relatórios
- **🔄 Atualizações em Tempo Real**: Notificações instantâneas de novos tickets
- **📱 Interface Responsiva**: Funciona em desktop e dispositivos móveis

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth + Microsoft OAuth 2.0
- **Email**: Microsoft Graph API
- **UI Components**: Shadcn/ui

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase
- Aplicação registrada no Azure AD (Microsoft)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/ticketsmail.git
cd ticketsmail
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_servico

# Microsoft OAuth
MICROSOFT_CLIENT_ID=seu_client_id
MICROSOFT_CLIENT_SECRET=seu_client_secret
MICROSOFT_TENANT_ID=common

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret
CRON_SECRET=string_aleatoria_segura
```

4. **Execute as migrações do banco de dados**

Use o arquivo `supabase/schema.sql` para criar as tabelas necessárias no seu projeto Supabase.

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse http://localhost:3000

## 🐳 Docker

Para rodar com Docker:

```bash
docker-compose up -d
```

O sistema estará disponível em http://localhost:3001

## 📦 Estrutura do Projeto

```
src/
├── app/              # Páginas e rotas (App Router)
├── components/       # Componentes React
├── lib/             # Utilitários e configurações
├── hooks/           # Custom React hooks
└── types/           # Definições TypeScript
```

## 🔐 Configuração Microsoft OAuth

1. Acesse [Azure Portal](https://portal.azure.com)
2. Registre uma nova aplicação
3. Configure as permissões:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
4. Adicione a URL de callback: `http://localhost:3000/auth/callback/microsoft`

## 🚀 Deploy

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/ticketsmail)

### Outras Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Next.js.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## 📧 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato.