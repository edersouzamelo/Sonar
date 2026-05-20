-- SCRIPT DE AJUSTE DE COLUNAS (V5 - FINAL FIX)
-- Adicionando colunas de compatibilidade para evitar erro PGRST204

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS om TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS sector TEXT;

-- Garantir que as permissões continuam valendo
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Anon" ON team_members;
CREATE POLICY "Acesso Total Anon" ON team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Verificação final das colunas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members';
