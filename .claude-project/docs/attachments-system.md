# Sistema de Anexos

## Visão Geral

O sistema de anexos permite que usuários façam upload de arquivos em tickets e interações, armazenando-os no Supabase Storage e mantendo referências no banco de dados.

## Componentes Implementados

### 1. AttachmentUpload (`/src/components/attachments/attachment-upload.tsx`)
- Upload de múltiplos arquivos via drag & drop ou seleção
- Validação de tamanho (máximo 10MB por padrão)
- Tipos de arquivo aceitos configuráveis
- Barra de progresso durante upload
- Preview de arquivos antes do envio

### 2. AttachmentList (`/src/components/attachments/attachment-list.tsx`)
- Listagem de anexos com ícones por tipo
- Download de arquivos
- Visualização de imagens
- Exclusão de anexos (com permissão)
- Informações de upload (usuário, data)

### 3. API de Upload (`/src/app/api/attachments/upload/route.ts`)
- Endpoints POST para upload e DELETE para remoção
- Validação de autenticação e permissões
- Integração com Supabase Storage
- Registro de auditoria

## Estrutura do Banco de Dados

### Tabela `attachments`
```sql
- id: UUID (PK)
- ticket_id: UUID (FK)
- interaction_id: UUID (FK, opcional)
- file_name: VARCHAR
- file_size: INTEGER
- file_type: VARCHAR
- mime_type: VARCHAR
- storage_path: TEXT
- url: TEXT
- uploaded_by: UUID (FK)
- upload_date: TIMESTAMP
- created_at: TIMESTAMP
```

### Storage Bucket
- Nome: `ticket-attachments`
- Estrutura: `{user_id}/{ticket_id}/{timestamp}.{extension}`
- Políticas RLS configuradas

## Integração na Página de Tickets

O sistema foi integrado na página de detalhes do ticket:
- Seção dedicada para anexos
- Upload direto na página
- Contador de anexos no badge
- Lista de anexos existentes

## Configuração Necessária

### 1. Executar Migration no Supabase
```sql
-- Executar o arquivo:
/supabase/migrations/add-attachments-support.sql
```

### 2. Verificar Bucket de Storage
- Acessar Supabase Dashboard > Storage
- Confirmar que o bucket `ticket-attachments` foi criado
- Verificar políticas de acesso

## Uso

### Upload de Arquivo
```tsx
<AttachmentUpload 
  ticketId={ticket.id}
  interactionId={optionalInteractionId}
  onUploadComplete={(attachment) => {
    // Callback após upload
  }}
  maxFileSize={10} // MB
  acceptedFileTypes={['image/*', '.pdf']}
/>
```

### Listagem de Anexos
```tsx
<AttachmentList 
  attachments={ticket.attachments}
  canDelete={true}
  onDelete={(attachmentId) => {
    // Callback após exclusão
  }}
/>
```

## Segurança

1. **Autenticação**: Apenas usuários autenticados podem fazer upload
2. **Validação**: Tamanho e tipo de arquivo são validados
3. **Permissões**: Apenas o uploader ou admin pode deletar
4. **Storage**: Arquivos são privados por padrão
5. **Auditoria**: Todas as ações são registradas

## Próximas Melhorias

1. Preview de PDFs
2. Compressão de imagens antes do upload
3. Upload em lote com progresso individual
4. Integração com anexos de email
5. Busca por nome de arquivo