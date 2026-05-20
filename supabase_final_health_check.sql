-- SCRIPT DE VERIFICAÇÃO E RESET ABSOLUTO (V4)
-- 1. PRIMEIRO, VAMOS VER O QUE TEM NO BANCO AGORA
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('team_members', 'tenders', 'date_checks')
    AND column_name IN ('id', 'assigned_pregoeiro_id', 'tender_id');

-- 2. RESET AGRESSIVO (Se o de cima mostrar "uuid", este resolve)
DROP TABLE IF EXISTS date_checks CASCADE;
DROP TABLE IF EXISTS conference_statuses CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- 3. RECRIAÇÃO LIMPA (Forçando TEXT em tudo)
CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    whatsapp TEXT,
    role TEXT,
    type TEXT NOT NULL,
    organization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenders (
    id TEXT PRIMARY KEY,
    uasg TEXT,
    number TEXT NOT NULL,
    nup TEXT,
    description TEXT,
    department TEXT,
    opening_date TIMESTAMPTZ,
    estimated_value NUMERIC,
    status TEXT NOT NULL,
    current_stage TEXT NOT NULL,
    has_issues BOOLEAN DEFAULT FALSE,
    is_gcalc BOOLEAN DEFAULT FALSE,
    commitment TEXT,
    requester_sector TEXT,
    coordinator TEXT,
    coord TEXT,
    section TEXT,
    responsible_internal TEXT,
    responsible_external TEXT,
    bi_publication TEXT,
    optimization_notes TEXT,
    next_deadline TEXT,
    next_activity TEXT,
    intercurrences TEXT,
    last_updated_by TEXT,
    verification_status TEXT DEFAULT 'Pendente',
    quick_notes TEXT,
    assigned_pregoeiro_id TEXT REFERENCES team_members(id),
    pregoeiro_fase_interna_id TEXT REFERENCES team_members(id),
    pregoeiro_fase_externa_id TEXT REFERENCES team_members(id),
    dates JSONB DEFAULT '{}'::jsonb,
    updates JSONB DEFAULT '[]'::jsonb,
    observations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conference_statuses (
    tender_id TEXT PRIMARY KEY REFERENCES tenders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE date_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id TEXT REFERENCES tenders(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tender_id, date_key)
);

-- 4. POLÍTICAS RLS (Garantindo que o sistema pode escrever)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Total Anon" ON team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total Anon" ON tenders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total Anon" ON conference_statuses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total Anon" ON date_checks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. VERIFICAÇÃO FINAL (Deve aparecer 'text' em todos os IDs após o Run)
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('team_members', 'tenders', 'date_checks')
    AND column_name IN ('id', 'assigned_pregoeiro_id', 'tender_id');
