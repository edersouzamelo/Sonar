-- SONAR - inicializacao limpa do backend Supabase
-- Este script cria apenas a estrutura. Nao importa dados do RADAR.

create extension if not exists pgcrypto;

create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text,
    avatar_url text,
    role text default 'Visitante',
    permissions jsonb default '{}'::jsonb,
    is_admin boolean default false,
    last_seen timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists team_members (
    id text primary key,
    name text not null,
    email text,
    whatsapp text,
    role text,
    type text not null,
    organization text,
    om text,
    sector text,
    permissions jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists tenders (
    id text primary key,
    uasg text,
    number text not null,
    nup text,
    description text,
    department text,
    opening_date timestamptz,
    estimated_value numeric,
    status text not null,
    current_stage text not null,
    has_issues boolean default false,
    is_gcalc boolean default false,
    commitment text,
    requester_sector text,
    coordinator text,
    coord text,
    section text,
    responsible_internal text,
    responsible_external text,
    bi_publication text,
    optimization_notes text,
    next_deadline text,
    next_activity text,
    intercurrences text,
    last_updated_by text,
    verification_status text default 'Pendente',
    quick_notes text,
    assigned_pregoeiro_id text references team_members(id),
    pregoeiro_fase_interna_id text references team_members(id),
    pregoeiro_fase_externa_id text references team_members(id),
    dates jsonb default '{}'::jsonb,
    updates jsonb default '[]'::jsonb,
    observations jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists conference_statuses (
    tender_id text primary key references tenders(id) on delete cascade,
    status text not null,
    updated_at timestamptz default now()
);

create table if not exists date_checks (
    id uuid primary key default gen_random_uuid(),
    tender_id text references tenders(id) on delete cascade,
    date_key text not null,
    is_checked boolean default false,
    updated_at timestamptz default now(),
    unique(tender_id, date_key)
);

create table if not exists access_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    user_name text,
    user_email text,
    user_role text,
    accessed_at timestamptz not null default now(),
    session_start boolean default true
);

create index if not exists idx_access_logs_accessed_at on access_logs(accessed_at desc);
create index if not exists idx_access_logs_user_id on access_logs(user_id, accessed_at desc);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_team_members_email on team_members(email);

alter table profiles enable row level security;
alter table team_members enable row level security;
alter table tenders enable row level security;
alter table conference_statuses enable row level security;
alter table date_checks enable row level security;
alter table access_logs enable row level security;

drop policy if exists "SONAR profiles select" on profiles;
drop policy if exists "SONAR profiles insert own" on profiles;
drop policy if exists "SONAR profiles update own" on profiles;
drop policy if exists "SONAR team access" on team_members;
drop policy if exists "SONAR tenders access" on tenders;
drop policy if exists "SONAR conference access" on conference_statuses;
drop policy if exists "SONAR date checks access" on date_checks;
drop policy if exists "SONAR access logs select own" on access_logs;
drop policy if exists "SONAR access logs insert own" on access_logs;

create policy "SONAR profiles select" on profiles
    for select to authenticated using (true);

create policy "SONAR profiles insert own" on profiles
    for insert to authenticated with check (auth.uid() = id);

create policy "SONAR profiles update own" on profiles
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Politicas amplas por enquanto, equivalentes ao RADAR, para manter o app funcionando.
-- Depois podemos endurecer por perfil/permissao quando o SONAR estiver estavel.
create policy "SONAR team access" on team_members
    for all to authenticated using (true) with check (true);

create policy "SONAR tenders access" on tenders
    for all to authenticated using (true) with check (true);

create policy "SONAR conference access" on conference_statuses
    for all to authenticated using (true) with check (true);

create policy "SONAR date checks access" on date_checks
    for all to authenticated using (true) with check (true);

create policy "SONAR access logs select own" on access_logs
    for select to authenticated using (auth.uid() = user_id);

create policy "SONAR access logs insert own" on access_logs
    for insert to authenticated with check (auth.uid() = user_id);

select
    table_name,
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'team_members', 'tenders', 'conference_statuses', 'date_checks', 'access_logs')
order by table_name, ordinal_position;
