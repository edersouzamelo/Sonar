-- SONAR - ajuste de RLS para o app local
-- Permite que o cliente publico autenticado leia/escreva nas tabelas operacionais.

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
    for select to anon, authenticated using (true);

create policy "SONAR profiles insert own" on profiles
    for insert to anon, authenticated with check (true);

create policy "SONAR profiles update own" on profiles
    for update to anon, authenticated using (true) with check (true);

create policy "SONAR team access" on team_members
    for all to anon, authenticated using (true) with check (true);

create policy "SONAR tenders access" on tenders
    for all to anon, authenticated using (true) with check (true);

create policy "SONAR conference access" on conference_statuses
    for all to anon, authenticated using (true) with check (true);

create policy "SONAR date checks access" on date_checks
    for all to anon, authenticated using (true) with check (true);

create policy "SONAR access logs select own" on access_logs
    for select to anon, authenticated using (true);

create policy "SONAR access logs insert own" on access_logs
    for insert to anon, authenticated with check (true);
