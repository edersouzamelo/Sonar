-- SONAR - Painel de Controle: adesao, auditoria de acesso e uso de espaco.
-- Execute uma vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

alter table if exists profiles add column if not exists last_seen timestamptz;
alter table if exists profiles add column if not exists avatar_url text;

create table if not exists access_logs (
    id uuid primary key default gen_random_uuid(),
    user_id text,
    user_name text,
    user_email text,
    user_role text,
    page_path text,
    user_agent text,
    accessed_at timestamptz not null default now()
);

create index if not exists idx_access_logs_accessed_at on access_logs(accessed_at desc);
create index if not exists idx_access_logs_user_email on access_logs(lower(user_email));

alter table access_logs enable row level security;

drop policy if exists "SONAR access logs insert authenticated" on access_logs;
drop policy if exists "SONAR access logs read authenticated" on access_logs;

create policy "SONAR access logs insert authenticated" on access_logs
    for insert to authenticated
    with check (true);

create policy "SONAR access logs read authenticated" on access_logs
    for select to authenticated
    using (true);

grant usage on schema public to anon, authenticated;
grant select, insert on table access_logs to anon, authenticated;

create or replace function public.sonar_database_usage()
returns table (
    database_bytes bigint,
    storage_bytes bigint,
    quota_bytes bigint
)
language sql
security definer
set search_path = public, storage
as $$
    select
        pg_database_size(current_database())::bigint as database_bytes,
        coalesce((
            select sum(coalesce((metadata->>'size')::bigint, 0))
            from storage.objects
            where bucket_id in ('service-orders', 'legal-documents', 'tender_documents', 'tender-documents')
        ), 0)::bigint as storage_bytes,
        (500 * 1024 * 1024)::bigint as quota_bytes;
$$;

grant execute on function public.sonar_database_usage() to anon, authenticated, service_role;
