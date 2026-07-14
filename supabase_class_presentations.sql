-- SONAR - Modulo de apresentacoes das Classes e CCOL
-- Execute no SQL Editor do Supabase quando for persistir o MVP fora da memoria do Next.js.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('class-presentations', 'class-presentations', false)
on conflict (id) do nothing;

create table if not exists class_presentation_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    purpose text not null default '',
    class_key text,
    file_path text not null,
    is_global boolean not null default false,
    is_default boolean not null default false,
    archived boolean not null default false,
    layouts jsonb not null default '[]'::jsonb,
    configuration jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_by_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists class_presentations (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    class_key text not null,
    context text not null default '',
    presentation_date date,
    status text not null default 'Rascunho',
    template_id uuid references class_presentation_templates(id) on delete set null,
    model_name text not null default 'Modelo livre do CCOL',
    responsible text not null,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_by_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,
    is_consolidated boolean not null default false,
    constraint class_presentations_status_check check (status in ('Rascunho', 'Em elaboracao', 'Pronta', 'Arquivada'))
);

create table if not exists class_presentation_slides (
    id uuid primary key default gen_random_uuid(),
    presentation_id uuid not null references class_presentations(id) on delete cascade,
    title text not null,
    slide_type text not null,
    position integer not null default 1,
    content jsonb not null default '{}'::jsonb,
    is_hidden boolean not null default false,
    publish_to_monitor boolean not null default false,
    monitor_duration integer not null default 15,
    background_color text not null default '#1A1A1A',
    show_footer boolean not null default true,
    class_identification text not null default '',
    reference_date date,
    data_source text,
    library_source_id uuid,
    updated_at timestamptz not null default now(),
    constraint class_presentation_slides_type_check check (slide_type in ('capa', 'livre', 'indicadores', 'tabela', 'grafico', 'processos', 'alerta', 'imagem', 'branco'))
);

create table if not exists class_presentation_assets (
    id uuid primary key default gen_random_uuid(),
    presentation_id uuid not null references class_presentations(id) on delete cascade,
    slide_id uuid references class_presentation_slides(id) on delete set null,
    file_name text not null,
    original_file_name text not null,
    file_path text not null,
    mime_type text,
    size_bytes bigint not null default 0,
    asset_type text not null default 'outro',
    processing_status text not null default 'armazenado',
    uploaded_by uuid references auth.users(id) on delete set null,
    uploaded_by_email text,
    uploaded_at timestamptz not null default now(),
    processed_at timestamptz,
    error_message text,
    extracted_text text,
    parsed_preview jsonb,
    constraint class_presentation_assets_type_check check (asset_type in ('dados', 'documento', 'imagem', 'modelo', 'outro')),
    constraint class_presentation_assets_status_check check (processing_status in ('pendente', 'processado', 'erro', 'armazenado'))
);

create table if not exists class_slide_library (
    id uuid primary key default gen_random_uuid(),
    class_key text not null,
    title text not null,
    slide_type text not null,
    content jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_by_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    used_in_presentation_ids uuid[] not null default '{}',
    constraint class_slide_library_type_check check (slide_type in ('capa', 'livre', 'indicadores', 'tabela', 'grafico', 'processos', 'alerta', 'imagem', 'branco'))
);

create index if not exists idx_class_presentations_class_key on class_presentations(class_key, updated_at desc);
create index if not exists idx_class_presentations_consolidated on class_presentations(is_consolidated, updated_at desc);
create index if not exists idx_class_presentation_slides_presentation on class_presentation_slides(presentation_id, position);
create index if not exists idx_class_presentation_slides_monitor on class_presentation_slides(publish_to_monitor, is_hidden);
create index if not exists idx_class_presentation_assets_presentation on class_presentation_assets(presentation_id, uploaded_at desc);
create index if not exists idx_class_slide_library_class_key on class_slide_library(class_key, updated_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table class_presentation_templates to authenticated;
grant select, insert, update, delete on table class_presentations to authenticated;
grant select, insert, update, delete on table class_presentation_slides to authenticated;
grant select, insert, update, delete on table class_presentation_assets to authenticated;
grant select, insert, update, delete on table class_slide_library to authenticated;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

alter table class_presentation_templates enable row level security;
alter table class_presentations enable row level security;
alter table class_presentation_slides enable row level security;
alter table class_presentation_assets enable row level security;
alter table class_slide_library enable row level security;

drop policy if exists "SONAR class presentation templates all" on class_presentation_templates;
drop policy if exists "SONAR class presentations all" on class_presentations;
drop policy if exists "SONAR class presentation slides all" on class_presentation_slides;
drop policy if exists "SONAR class presentation assets all" on class_presentation_assets;
drop policy if exists "SONAR class slide library all" on class_slide_library;

create policy "SONAR class presentation templates all" on class_presentation_templates
    for all to authenticated
    using (true)
    with check (true);

create policy "SONAR class presentations all" on class_presentations
    for all to authenticated
    using (true)
    with check (true);

create policy "SONAR class presentation slides all" on class_presentation_slides
    for all to authenticated
    using (
        exists (
            select 1
            from class_presentations p
            where p.id = class_presentation_slides.presentation_id
        )
    )
    with check (
        exists (
            select 1
            from class_presentations p
            where p.id = class_presentation_slides.presentation_id
        )
    );

create policy "SONAR class presentation assets all" on class_presentation_assets
    for all to authenticated
    using (
        exists (
            select 1
            from class_presentations p
            where p.id = class_presentation_assets.presentation_id
        )
    )
    with check (
        exists (
            select 1
            from class_presentations p
            where p.id = class_presentation_assets.presentation_id
        )
    );

create policy "SONAR class slide library all" on class_slide_library
    for all to authenticated
    using (true)
    with check (true);

drop policy if exists "SONAR class presentations storage read" on storage.objects;
drop policy if exists "SONAR class presentations storage insert" on storage.objects;
drop policy if exists "SONAR class presentations storage update" on storage.objects;
drop policy if exists "SONAR class presentations storage delete" on storage.objects;

create policy "SONAR class presentations storage read" on storage.objects
    for select to authenticated
    using (bucket_id = 'class-presentations');

create policy "SONAR class presentations storage insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'class-presentations');

create policy "SONAR class presentations storage update" on storage.objects
    for update to authenticated
    using (bucket_id = 'class-presentations')
    with check (bucket_id = 'class-presentations');

create policy "SONAR class presentations storage delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'class-presentations');
