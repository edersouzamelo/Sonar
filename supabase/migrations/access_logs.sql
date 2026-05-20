-- Tabela de logs de acesso para histórico semanal/mensal/anual
create table if not exists access_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    user_name text,
    user_email text,
    user_role text,
    accessed_at timestamptz not null default now(),
    session_start boolean default true
);

-- Índice para queries rápidas por período
create index if not exists idx_access_logs_accessed_at on access_logs(accessed_at desc);
create index if not exists idx_access_logs_user_id on access_logs(user_id, accessed_at desc);

-- RLS: Apenas admins leem todos os logs; cada usuário vê os próprios
alter table access_logs enable row level security;

create policy "Admins podem ver todos os logs" on access_logs
    for select using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and (profiles.is_admin = true or profiles.role = 'Administrador')
        )
    );

create policy "Usuários podem inserir seus próprios logs" on access_logs
    for insert with check (auth.uid() = user_id);
