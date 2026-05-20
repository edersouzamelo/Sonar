-- SCRIPT DE RESET NUCLEAR (LIMPEZA TOTAL E RECRIAÇÃO)
-- Use este script se a sincronia estiver dando erro de "UUID" ou "Type mismatch".
-- ATENÇÃO: Isso apaga os dados existentes APENAS no Supabase (não afeta seu computador).

-- 1. APAGAR TUDO (Limpando o terreno)
DROP TABLE IF EXISTS date_checks CASCADE;
DROP TABLE IF EXISTS conference_statuses CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- 2. RECRIAÇÃO COM TIPOS CORRETOS (TEXT PARA TUDO)
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

-- 3. SEGURANÇA (RLS)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissao Total" ON team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total" ON tenders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total" ON conference_statuses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total" ON date_checks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
