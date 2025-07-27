# Sistema de Filtros e Busca

## Visão Geral

O sistema de filtros e busca permite que usuários encontrem rapidamente tickets específicos através de múltiplos critérios de busca e filtros avançados.

## Funcionalidades Implementadas

### 1. Busca por Texto
- Busca em múltiplos campos simultaneamente:
  - Número do ticket
  - Assunto
  - Email do remetente
  - Nome do remetente
- Busca em tempo real ao pressionar Enter ou clicar em "Buscar"

### 2. Filtros Avançados

#### Status
- Todos
- Novo
- Em Andamento
- Aguardando Resposta
- Resolvido
- Fechado

#### Prioridade
- Todas
- Baixa
- Média
- Alta
- Urgente

#### Intervalo de Datas
- Data inicial (de)
- Data final (até)
- Validação para garantir que data final >= data inicial

### 3. Interface de Usuário

#### Componente TicketFilters
- Toggle para mostrar/ocultar filtros avançados
- Contador de filtros ativos no botão
- Badges para filtros aplicados
- Botão de limpar filtros individuais ou todos

#### Estados Visuais
- Loading state durante busca
- Contador de resultados encontrados
- Mensagem personalizada quando nenhum resultado
- Indicadores visuais de filtros ativos

### 4. Integração com URL

Os filtros são salvos na URL como query parameters:
- `?search=termo`
- `?status=new`
- `?priority=high`
- `?from=2024-01-01`
- `?to=2024-12-31`

Isso permite:
- Compartilhar buscas específicas
- Voltar/avançar no navegador mantendo filtros
- Bookmarks de buscas frequentes

## Componentes

### TicketFilters (`/src/components/tickets/ticket-filters.tsx`)
Componente principal que gerencia todos os filtros e busca.

### Página de Tickets (`/src/app/tickets/page.tsx`)
Convertida para client component para suportar filtros dinâmicos.

## Uso

### Busca Simples
1. Digite o termo na barra de busca
2. Pressione Enter ou clique em "Buscar"

### Filtros Avançados
1. Clique no botão "Filtros"
2. Selecione os critérios desejados
3. Clique em "Aplicar Filtros"

### Limpar Filtros
- Clique no X em cada badge de filtro individual
- Ou clique em "Limpar Filtros" para remover todos

## Performance

### Otimizações Implementadas
- Debounce na busca (evita muitas requisições)
- Limite de 50 tickets por página
- Índices no banco de dados para campos de busca

### Próximas Melhorias
1. Paginação para grandes volumes
2. Busca full-text com ranking
3. Filtros salvos/favoritos
4. Exportação de resultados filtrados

## Query SQL Gerada

```sql
SELECT * FROM tickets
WHERE (
  ticket_number ILIKE '%termo%' OR
  subject ILIKE '%termo%' OR
  from_email ILIKE '%termo%' OR
  from_name ILIKE '%termo%'
)
AND status = 'new'
AND priority = 'high'
AND created_at >= '2024-01-01T00:00:00'
AND created_at <= '2024-12-31T23:59:59'
ORDER BY created_at DESC
LIMIT 50
```

## Segurança

- Todos os inputs são sanitizados
- Queries parametrizadas (previne SQL injection)
- Filtros aplicados server-side
- Respeita permissões do usuário