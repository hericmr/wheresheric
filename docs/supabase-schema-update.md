# Atualização do Schema Supabase: Adicionar Coluna Accuracy

## Problema
Uma aplicação externa está tentando inserir dados na tabela `location_updates` com uma coluna `accuracy` que não existe, causando o erro:

```
Object { code: "PGRST204", details: null, hint: null, message: "Could not find the 'accuracy' column of 'location_updates' in the schema cache" }
```

## Solução
Adicionar a coluna `accuracy` à tabela `location_updates` como opcional (nullable) para manter compatibilidade.

## SQL para Atualização

```sql
-- Adicionar coluna accuracy à tabela location_updates
ALTER TABLE location_updates 
ADD COLUMN accuracy DECIMAL(10,2) NULL;

-- Comentário explicativo
COMMENT ON COLUMN location_updates.accuracy IS 'Precisão da localização em metros (opcional)';
```

## Estrutura Atualizada da Tabela

### Tabela `location_updates`
```sql
- id: UUID (Primary Key)
- lat: DECIMAL (Latitude)
- lng: DECIMAL (Longitude)
- accuracy: DECIMAL(10,2) NULL (NOVO - opcional)
- created_at: TIMESTAMP
```

## Como Executar

### 1. Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Execute o comando SQL acima
4. Clique em "Run"

### 2. Via Supabase CLI
```bash
# Se você tiver o Supabase CLI configurado
supabase db push
```

## Impacto

### ✅ **Benefícios**
- Resolve o erro de inserção
- Mantém compatibilidade com dados existentes
- Permite que aplicações externas enviem dados de precisão
- Não quebra funcionalidades existentes

### ⚠️ **Considerações**
- A coluna é opcional, então não afeta dados existentes
- Aplicações que não enviam `accuracy` continuam funcionando
- Aplicações que enviam `accuracy` agora funcionam corretamente

## Verificação

Após executar a atualização, verifique se:

1. **Dados existentes** ainda são acessíveis
2. **Novas inserções** funcionam com e sem `accuracy`
3. **Aplicação externa** não apresenta mais erros

## Rollback (se necessário)

Se precisar reverter a mudança:

```sql
-- Remover coluna accuracy
ALTER TABLE location_updates 
DROP COLUMN accuracy;
```

## Notas

- A coluna `accuracy` é opcional e pode ser NULL
- Não há impacto no código atual do projeto
- A aplicação externa que estava causando erro agora funcionará
- Dados de precisão podem ser úteis para melhorar a qualidade do rastreamento 