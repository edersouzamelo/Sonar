-- SONAR - Ordens de Servico persistentes
-- Execute no SQL Editor do Supabase antes de usar o upload persistente.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('service-orders', 'service-orders', false)
on conflict (id) do nothing;

create table if not exists service_orders (
    id uuid primary key default gen_random_uuid(),
    file_name text not null,
    file_path text not null unique,
    mime_type text,
    size_bytes bigint not null default 0,
    uploaded_by text not null,
    uploaded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    extracted_text text,
    file_data_base64 text,
    file_data_mime text
);

alter table service_orders add column if not exists file_data_base64 text;
alter table service_orders add column if not exists file_data_mime text;

create table if not exists service_order_deadlines (
    id uuid primary key default gen_random_uuid(),
    service_order_id uuid not null references service_orders(id) on delete cascade,
    title text not null,
    due_date date not null,
    source_file text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_service_orders_uploaded_at on service_orders(uploaded_at desc);
create index if not exists idx_service_order_deadlines_due_date on service_order_deadlines(due_date);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table service_orders to anon, authenticated;
grant select, insert, update, delete on table service_order_deadlines to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on table storage.objects to anon, authenticated;

alter table service_orders enable row level security;
alter table service_order_deadlines enable row level security;

drop policy if exists "SONAR service orders read" on service_orders;
drop policy if exists "SONAR service order deadlines read" on service_order_deadlines;
drop policy if exists "SONAR service orders all" on service_orders;
drop policy if exists "SONAR service order deadlines all" on service_order_deadlines;

create policy "SONAR service orders all" on service_orders
    for all to anon, authenticated
    using (true)
    with check (true);

create policy "SONAR service order deadlines all" on service_order_deadlines
    for all to anon, authenticated
    using (true)
    with check (true);

drop policy if exists "SONAR service orders storage read" on storage.objects;
drop policy if exists "SONAR service orders storage insert" on storage.objects;
drop policy if exists "SONAR service orders storage update" on storage.objects;
drop policy if exists "SONAR service orders storage delete" on storage.objects;

create policy "SONAR service orders storage read" on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'service-orders');

create policy "SONAR service orders storage insert" on storage.objects
    for insert to anon, authenticated
    with check (bucket_id = 'service-orders');

create policy "SONAR service orders storage update" on storage.objects
    for update to anon, authenticated
    using (bucket_id = 'service-orders')
    with check (bucket_id = 'service-orders');

create policy "SONAR service orders storage delete" on storage.objects
    for delete to anon, authenticated
    using (bucket_id = 'service-orders');
