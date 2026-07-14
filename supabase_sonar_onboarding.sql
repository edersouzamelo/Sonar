alter table public.profiles
    add column if not exists sonar_guide_completed_at timestamptz;

comment on column public.profiles.sonar_guide_completed_at is
    'Marca quando o usuario concluiu/dispensou o guia inicial do SONAR.';

grant select, update on public.profiles to authenticated;
