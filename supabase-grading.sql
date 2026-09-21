-- Supabase SQL Editor에서 한 번 실행하세요.
create table if not exists public.grading_configs (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.grading_results (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  classroom text not null check (classroom ~ '^\d{4}$'),
  items jsonb not null,
  total_score integer not null check (total_score between 12 and 30),
  source text not null check (source in ('manual','ai')),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_score_publications (
  classroom text primary key check (classroom ~ '^\d$'),
  results jsonb not null,
  published_at timestamptz not null default now()
);

alter table public.grading_configs enable row level security;
alter table public.grading_results enable row level security;
alter table public.class_score_publications enable row level security;
grant select, insert, update on public.grading_configs to service_role;
grant select, insert, update on public.grading_results to service_role;
grant select, insert, update on public.class_score_publications to service_role;
