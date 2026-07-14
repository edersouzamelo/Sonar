-- SONAR - DIEx normativos, regulamentos e legislacoes persistentes
-- Execute no SQL Editor do Supabase antes de usar o upload persistente.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('legal-documents', 'legal-documents', false)
on conflict (id) do nothing;

create table if not exists legal_documents (
    id uuid primary key default gen_random_uuid(),
    file_name text not null,
    file_path text not null unique,
    mime_type text,
    size_bytes bigint not null default 0,
    uploaded_by text not null,
    uploaded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    document_type text,
    document_number text,
    issuing_body text,
    subject text,
    effective_date date,
    tags text[] not null default '{}',
    extracted_text text,
    file_data_base64 text,
    file_data_mime text
);

alter table legal_documents add column if not exists document_type text;
alter table legal_documents add column if not exists document_number text;
alter table legal_documents add column if not exists issuing_body text;
alter table legal_documents add column if not exists subject text;
alter table legal_documents add column if not exists effective_date date;
alter table legal_documents add column if not exists tags text[] not null default '{}';
alter table legal_documents add column if not exists file_data_base64 text;
alter table legal_documents add column if not exists file_data_mime text;

create table if not exists legal_document_deadlines (
    id uuid primary key default gen_random_uuid(),
    legal_document_id uuid not null references legal_documents(id) on delete cascade,
    title text not null,
    due_date date not null,
    source_file text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_legal_documents_uploaded_at on legal_documents(uploaded_at desc);
create index if not exists idx_legal_documents_type on legal_documents(document_type);
create index if not exists idx_legal_documents_effective_date on legal_documents(effective_date);
create index if not exists idx_legal_document_deadlines_due_date on legal_document_deadlines(due_date);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table legal_documents to anon, authenticated;
grant select, insert, update, delete on table legal_document_deadlines to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on table storage.objects to anon, authenticated;

alter table legal_documents enable row level security;
alter table legal_document_deadlines enable row level security;

drop policy if exists "SONAR legal documents all" on legal_documents;
drop policy if exists "SONAR legal document deadlines all" on legal_document_deadlines;

create policy "SONAR legal documents all" on legal_documents
    for all to anon, authenticated
    using (true)
    with check (true);

create policy "SONAR legal document deadlines all" on legal_document_deadlines
    for all to anon, authenticated
    using (true)
    with check (true);

drop policy if exists "SONAR legal documents storage read" on storage.objects;
drop policy if exists "SONAR legal documents storage insert" on storage.objects;
drop policy if exists "SONAR legal documents storage update" on storage.objects;
drop policy if exists "SONAR legal documents storage delete" on storage.objects;

create policy "SONAR legal documents storage read" on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'legal-documents');

create policy "SONAR legal documents storage insert" on storage.objects
    for insert to anon, authenticated
    with check (bucket_id = 'legal-documents');

create policy "SONAR legal documents storage update" on storage.objects
    for update to anon, authenticated
    using (bucket_id = 'legal-documents')
    with check (bucket_id = 'legal-documents');

create policy "SONAR legal documents storage delete" on storage.objects
    for delete to anon, authenticated
    using (bucket_id = 'legal-documents');
