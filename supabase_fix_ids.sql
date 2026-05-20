-- SCRIPT DE CORREÇÃO DE ESQUEMA (UUID -> TEXT)
-- Execute este script no SQL Editor do Supabase se você já criou as tabelas.
-- Se ainda não criou, use o supabase_init.sql atualizado.

-- 1. Remover dependências para permitir alteração de tipos
ALTER TABLE conference_statuses DROP CONSTRAINT IF EXISTS conference_statuses_tender_id_fkey;
ALTER TABLE date_checks DROP CONSTRAINT IF EXISTS date_checks_tender_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_assigned_pregoeiro_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_pregoeiro_fase_interna_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_pregoeiro_fase_externa_id_fkey;

-- 2. Alterar colunas de ID para TEXT
ALTER TABLE team_members ALTER COLUMN id TYPE TEXT;
ALTER TABLE tenders ALTER COLUMN id TYPE TEXT;
ALTER TABLE tenders ALTER COLUMN assigned_pregoeiro_id TYPE TEXT;
ALTER TABLE tenders ALTER COLUMN pregoeiro_fase_interna_id TYPE TEXT;
ALTER TABLE tenders ALTER COLUMN pregoeiro_fase_externa_id TYPE TEXT;
ALTER TABLE conference_statuses ALTER COLUMN tender_id TYPE TEXT;
ALTER TABLE date_checks ALTER COLUMN tender_id TYPE TEXT;

-- 3. Restaurar as constraints
ALTER TABLE conference_statuses ADD CONSTRAINT conference_statuses_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE;
ALTER TABLE date_checks ADD CONSTRAINT date_checks_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE;
ALTER TABLE tenders ADD CONSTRAINT tenders_assigned_pregoeiro_id_fkey FOREIGN KEY (assigned_pregoeiro_id) REFERENCES team_members(id);
ALTER TABLE tenders ADD CONSTRAINT tenders_pregoeiro_fase_interna_id_fkey FOREIGN KEY (pregoeiro_fase_interna_id) REFERENCES team_members(id);
ALTER TABLE tenders ADD CONSTRAINT tenders_pregoeiro_fase_externa_id_fkey FOREIGN KEY (pregoeiro_fase_externa_id) REFERENCES team_members(id);
-- 4. Atualizar políticas RLS para permitir acesso anon/auth
DROP POLICY IF EXISTS "Acesso Total para Autenticados" ON team_members;
DROP POLICY IF EXISTS "Acesso Total para Autenticados" ON tenders;
DROP POLICY IF EXISTS "Acesso Total para Autenticados" ON conference_statuses;
DROP POLICY IF EXISTS "Acesso Total para Autenticados" ON date_checks;

CREATE POLICY "Acesso Permitido" ON team_members FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Acesso Permitido" ON tenders FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Acesso Permitido" ON conference_statuses FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Acesso Permitido" ON date_checks FOR ALL TO anon, authenticated USING (true);
