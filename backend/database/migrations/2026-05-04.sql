-- 2026-05-04: Adicionar business_id à tabela facebook_accounts
-- Permite salvar o BM ID vinculado a cada conta para sincronização automática

ALTER TABLE facebook_accounts
ADD COLUMN IF NOT EXISTS business_id VARCHAR(100) DEFAULT NULL;
