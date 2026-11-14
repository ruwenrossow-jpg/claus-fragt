alter table public.forms add column if not exists owner_id uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists forms_owner_idx on public.forms (owner_id);
