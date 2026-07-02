create table if not exists public.military_command_groups (
  id text primary key,
  name text not null,
  location text not null default '',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.military_organizations (
  id text primary key,
  group_id text not null references public.military_command_groups(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_military_command_groups_active_position
  on public.military_command_groups(is_active, position);

create index if not exists idx_military_organizations_group_active_position
  on public.military_organizations(group_id, is_active, position);

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on table public.military_command_groups to service_role;
grant all privileges on table public.military_organizations to service_role;
grant select, insert, update, delete on table public.military_command_groups to authenticated;
grant select, insert, update, delete on table public.military_organizations to authenticated;

alter table public.military_command_groups enable row level security;
alter table public.military_organizations enable row level security;

drop policy if exists "Authenticated users can read military command groups" on public.military_command_groups;
create policy "Authenticated users can read military command groups"
  on public.military_command_groups for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can write military command groups" on public.military_command_groups;
create policy "Authenticated users can write military command groups"
  on public.military_command_groups for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read military organizations" on public.military_organizations;
create policy "Authenticated users can read military organizations"
  on public.military_organizations for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can write military organizations" on public.military_organizations;
create policy "Authenticated users can write military organizations"
  on public.military_organizations for all
  to authenticated
  using (true)
  with check (true);
