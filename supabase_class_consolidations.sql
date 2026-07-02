create extension if not exists pgcrypto;

create table if not exists public.class_consolidation_columns (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  name text not null,
  due_date date,
  consolidation_scope text not null default 'om',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.class_consolidation_columns
  add column if not exists due_date date;

alter table public.class_consolidation_columns
  add column if not exists consolidation_scope text not null default 'om';

update public.class_consolidation_columns
set consolidation_scope = 'om'
where consolidation_scope is null
   or consolidation_scope not in ('om', 'command');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'class_consolidation_columns_scope_check'
  ) then
    alter table public.class_consolidation_columns
      add constraint class_consolidation_columns_scope_check
      check (consolidation_scope in ('om', 'command'));
  end if;
end $$;

create table if not exists public.class_consolidation_files (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  row_id text not null,
  row_name text not null,
  column_id uuid not null references public.class_consolidation_columns(id) on delete cascade,
  file_name text not null,
  original_file_name text,
  file_path text,
  mime_type text,
  size_bytes bigint not null default 0,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  extracted_text text,
  extraction_status text not null default 'pending',
  extraction_error text,
  file_data_base64 text,
  file_data_mime text
);

alter table public.class_consolidation_files
  add column if not exists original_file_name text;

alter table public.class_consolidation_files
  add column if not exists extracted_text text;

alter table public.class_consolidation_files
  add column if not exists extraction_status text not null default 'pending';

alter table public.class_consolidation_files
  add column if not exists extraction_error text;

do $$
declare
  constraint_name text;
  index_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'class_consolidation_files'
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname::text)
        from unnest(con.conkey) as keys(attnum)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = keys.attnum
      ) = array['class_key', 'column_id', 'row_id']
  loop
    execute format('alter table public.class_consolidation_files drop constraint %I', constraint_name);
  end loop;

  for index_name in
    select idx.relname
    from pg_index i
    join pg_class idx on idx.oid = i.indexrelid
    join pg_class rel on rel.oid = i.indrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'class_consolidation_files'
      and i.indisunique
      and not exists (
        select 1
        from pg_constraint con
        where con.conindid = i.indexrelid
      )
      and (
        select array_agg(att.attname::text order by att.attname::text)
        from regexp_split_to_table(i.indkey::text, '\s+') as keys(attnum_text)
        join pg_attribute att on att.attrelid = i.indrelid and att.attnum = keys.attnum_text::int
      ) = array['class_key', 'column_id', 'row_id']
  loop
    execute format('drop index if exists public.%I', index_name);
  end loop;
end $$;

create index if not exists idx_class_consolidation_columns_class_key
  on public.class_consolidation_columns(class_key, position);

create index if not exists idx_class_consolidation_files_class_key
  on public.class_consolidation_files(class_key, row_id, column_id);

grant usage on schema public to anon, authenticated, service_role;
grant all on table public.class_consolidation_columns to service_role;
grant all on table public.class_consolidation_files to service_role;
grant select, insert, update, delete on table public.class_consolidation_columns to authenticated;
grant select, insert, update, delete on table public.class_consolidation_files to authenticated;

alter table public.class_consolidation_columns enable row level security;
alter table public.class_consolidation_files enable row level security;

drop policy if exists "Authenticated users can read class consolidation columns" on public.class_consolidation_columns;
create policy "Authenticated users can read class consolidation columns"
  on public.class_consolidation_columns for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can write class consolidation columns" on public.class_consolidation_columns;
create policy "Authenticated users can write class consolidation columns"
  on public.class_consolidation_columns for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read class consolidation files" on public.class_consolidation_files;
create policy "Authenticated users can read class consolidation files"
  on public.class_consolidation_files for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can write class consolidation files" on public.class_consolidation_files;
create policy "Authenticated users can write class consolidation files"
  on public.class_consolidation_files for all
  to authenticated
  using (true)
  with check (true);

insert into public.class_consolidation_columns (class_key, name, position, is_active)
select 'classe-ii-material-de-intendencia', seed.name, seed.position, true
from (
  values
    ('Demanda inicial', 1),
    ('Mapa de necessidades', 2),
    ('Documento de consolidação', 3)
) as seed(name, position)
where not exists (
  select 1
  from public.class_consolidation_columns c
  where c.class_key = 'classe-ii-material-de-intendencia'
);
