-- Claus fragt: Grundgerüst für Evaluationsbögen
-- Bögen -> Fragen -> Antworten (eine "response" pro ausgefülltem Bogen, je Frage eine "answer")

create extension if not exists pgcrypto;

create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Unbenannter Bogen',
  description text,
  status      text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  style       text,                       -- später: gewählter Stil (Design-Regeln, Maskottchen …)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.forms(id) on delete cascade,
  position   integer not null default 0,
  step       smallint check (step between 1 and 5),   -- Schritt im 5er-Framework (vorerst optional)
  type       text not null check (type in ('short_text', 'long_text', 'single_choice', 'multiple_choice', 'scale', 'yes_no')),
  label      text not null default '',
  help_text  text,
  required   boolean not null default false,
  options    jsonb not null default '[]'::jsonb,      -- Antwortoptionen bei Auswahlfragen
  settings   jsonb not null default '{}'::jsonb,      -- z. B. Skala min/max/Beschriftungen
  created_at timestamptz not null default now()
);
create index if not exists questions_form_idx on public.questions(form_id, position);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.forms(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists responses_form_idx on public.responses(form_id);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  value       jsonb,
  unique (response_id, question_id)
);
create index if not exists answers_question_idx on public.answers(question_id);

-- updated_at automatisch pflegen
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists forms_touch on public.forms;
create trigger forms_touch before update on public.forms
  for each row execute function public.touch_updated_at();

-- RLS: Hackathon-Modus, noch ohne Login. Jeder mit Publishable Key darf lesen/schreiben.
-- Sobald Auth dazukommt, diese Policies durch owner-basierte ersetzen.
alter table public.forms     enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers   enable row level security;

create policy "hackathon_all_forms"     on public.forms     for all to anon, authenticated using (true) with check (true);
create policy "hackathon_all_questions" on public.questions for all to anon, authenticated using (true) with check (true);
create policy "hackathon_all_responses" on public.responses for all to anon, authenticated using (true) with check (true);
create policy "hackathon_all_answers"   on public.answers   for all to anon, authenticated using (true) with check (true);
