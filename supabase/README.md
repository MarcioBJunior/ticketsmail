# Configuração do Banco de Dados Supabase

## Ordem de Execução dos Scripts SQL

Execute os scripts SQL no Supabase SQL Editor na seguinte ordem:

### 1. Schema Inicial (001_initial_schema.sql)
Este script cria:
- Tipos ENUM customizados
- Todas as tabelas do sistema
- Índices para performance
- Triggers para atualização automática de timestamps
- Função para geração automática de número de ticket

### 2. Políticas RLS (002_rls_policies.sql)
Este script configura:
- Row Level Security em todas as tabelas
- Funções auxiliares de permissão
- Políticas de acesso por usuário/role

### 3. Funções de Autenticação (003_auth_functions.sql)
Este script adiciona:
- Trigger para criar perfil de usuário no signup
- Função para métricas do dashboard
- Sistema de audit log
- Permissões de execução

## Como Executar

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para SQL Editor
3. Cole e execute cada script na ordem indicada
4. Verifique se não há erros

## Notas Importantes

- O primeiro usuário cadastrado será automaticamente ADMIN
- Os demais usuários serão COLLABORATORS
- As políticas RLS garantem que usuários só vejam dados permitidos
- O sistema de audit log registra todas as ações importantes