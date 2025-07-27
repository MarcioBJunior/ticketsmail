# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Ticket Management System** that converts emails from Microsoft Outlook/Exchange and Gmail into organized tickets with complete tracking, interaction, and management capabilities.

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: TailwindCSS + Shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **Email APIs**: Microsoft Graph API + Gmail API (OAuth2)

## Common Development Commands

### Project Setup
```bash
# Initialize new Next.js project (if not already created)
npx create-next-app@latest ticket-system --typescript --tailwind --eslint

# Install dependencies
npm install

# Install Shadcn/ui
npx shadcn-ui@latest init

# Install Supabase client
npm install @supabase/supabase-js

# Install Microsoft Graph client
npm install @microsoft/microsoft-graph-client
```

### Development
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

### Testing
```bash
# Run tests (when configured)
npm test

# Run tests in watch mode
npm test:watch
```

## Project Structure

### Required Documentation Structure
```
.claude-project/
├── docs/                    # Project documentation
│   ├── roadmap.md          # Development roadmap
│   ├── progress.md         # Current progress tracking
│   ├── architecture.md     # System architecture
│   ├── requirements.md     # Requirements and specs
│   └── decisions.md        # Technical decisions log
├── memory/                 # Project memory system
│   ├── implementations.md  # Completed implementations
│   ├── patterns.md         # Code patterns and conventions
│   ├── dependencies.md     # Dependencies and versions
│   └── lessons.md          # Lessons learned
├── testing/                # Testing environment
│   ├── scripts/            # Test scripts
│   ├── experiments/        # Experimental code
│   └── external-tests/     # External service tests
└── config/                 # Project configuration
    ├── style-guide.md      # UI/UX style guide
    ├── coding-standards.md # Code standards
    └── project-rules.md    # Project-specific rules
```

### Source Code Structure
```
src/
├── components/          # Reusable components
│   ├── ui/             # Base components (shadcn/ui)
│   ├── layout/         # Layout components
│   └── feature/        # Feature-specific components
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   └── dashboard/     # Dashboard pages
├── lib/               # Utilities and configs
│   ├── supabase.ts    # Supabase client
│   ├── auth.ts        # Auth configuration
│   └── utils.ts       # Utility functions
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
└── styles/            # Global styles
```

## Key Features and Architecture

### Core Functionality
1. **Email Capture System**: Integrates with Microsoft Graph API (primary) and Gmail API (future) to capture emails based on folders, tags, senders, and custom filters
2. **Ticket Management**: Automatically converts emails to tickets with unique IDs, tracking status, assignees, and interaction history
3. **Interaction System**: Allows email responses directly from tickets, maintains conversation history, and supports internal comments
4. **User Management**: Full user system with roles (Admin/Collaborator) and granular permissions
5. **Analytics Dashboard**: Real-time metrics, advanced filtering, and exportable reports

### Database Schema (Supabase)
- `users`: System collaborators
- `email_accounts`: Connected email accounts
- `tickets`: Main ticket entities
- `ticket_interactions`: Responses and comments
- `attachments`: File attachments
- `audit_logs`: Action logs

### API Integration Points
- Microsoft Graph API for Outlook/Exchange email access
- Gmail API for Google email access (future)
- Supabase for database, auth, and storage
- Next.js API routes for business logic

## Development Guidelines

### Code Conventions
- **TypeScript**: Use interfaces with `I` prefix (e.g., `ITicket`)
- **Types**: Use `Type` suffix for type definitions (e.g., `TicketStatusType`)
- **Components**: PascalCase naming
- **Hooks**: Prefix with `use`
- **API Routes**: RESTful conventions in `/pages/api/`

### Development Workflow
1. **Always check** `.claude-project/docs/progress.md` before starting work
2. **Consult** `.claude-project/docs/architecture.md` for structural decisions
3. **Document** all implementations in progress.md
4. **Follow** the roadmap phases in order
5. **Test** email integrations in `.claude-project/testing/external-tests/`

### Priority Order (from Roadmap)
1. **Phase 1**: Project setup, authentication, database models, basic UI
2. **Phase 2**: Microsoft Graph integration, email capture, ticket creation, response system
3. **Phase 3**: Full dashboard, assignment system, advanced filters, attachments, reports
4. **Phase 4**: Gmail integration, notifications, data export, optimizations

## Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Microsoft Graph
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Gmail API (future)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Important Notes
- **OAuth2 Security**: All email integrations use OAuth2 for secure access
- **Webhook/Cron**: Email checking is done via scheduled jobs, not real-time
- **Multi-tenant Ready**: Architecture supports future multi-tenant expansion
- **Performance Target**: All critical operations should complete in <2 seconds

## Before Starting Development
1. Create the `.claude-project/` structure if it doesn't exist
2. Read existing documentation in `.claude-project/docs/`
3. Verify current progress and next tasks
4. Ensure all dependencies are installed
5. Set up environment variables for external services