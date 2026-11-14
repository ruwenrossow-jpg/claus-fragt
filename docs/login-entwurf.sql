-- ENTWURF – NICHT AUSFÜHREN, bevor Ruwen ihn geprüft hat (siehe docs/PLAN-LOGIN.md).
-- Liegt absichtlich NICHT in supabase/migrations/.
-- Reihenfolge: Sicherung → Spalte → Ruwen meldet sich an → Bögen zuordnen → Policies tauschen → RPCs.

-- 1) Eigentümer:in je Bogen ------------------------------------------------------------
alter table public.forms add column if not exists owner_id uuid references auth.users(id);
create index if not exists forms_owner_idx on public.forms(owner_id);

-- 2) Bestehende Bögen Ruwen zuordnen (seine auth.users.id nach dem ersten Login einsetzen) --
-- update public.forms set owner_id = '<RUWENS-USER-ID>' where owner_id is null;
-- alter table public.forms alter column owner_id set not null;
-- alter table public.forms alter column owner_id set default auth.uid();

-- 3) Offene Hackathon-Policies ersetzen --------------------------------------------------
drop policy if exists "hackathon_all_forms"     on public.forms;
drop policy if exists "hackathon_all_questions" on public.questions;
drop policy if exists "hackathon_all_responses" on public.responses;
drop policy if exists "hackathon_all_answers"   on public.answers;

-- Bögen: nur die eigene Person; kein DELETE (Soft-Delete über settings.geloescht)
create policy forms_select_own on public.forms for select to authenticated using (owner_id = auth.uid());
create policy forms_insert_own on public.forms for insert to authenticated with check (owner_id = auth.uid());
create policy forms_update_own on public.forms for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Fragen: über den Bogen
create policy questions_own on public.questions for all to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

-- Abgaben/Antworten lesen: nur Eigentümer:in (Teilnehmende schreiben über submit_response)
create policy responses_read_own on public.responses for select to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));
create policy answers_read_own on public.answers for select to authenticated
  using (exists (select 1 from public.responses r join public.forms f on f.id = r.form_id where r.id = response_id and f.owner_id = auth.uid()));

-- 4) Öffentlicher Zugriff nur über Funktionen --------------------------------------------
create or replace function public.public_form(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case
    when f.id is null then null
    when f.settings->>'geloescht' is not null then jsonb_build_object('status', 'geloescht')
    when f.status <> 'published' then jsonb_build_object('status', f.status, 'style', f.style)
    else jsonb_build_object(
      'id', f.id, 'title', f.title, 'description', f.description, 'status', f.status, 'style', f.style,
      'settings', f.settings - 'test', 'public_slug', f.public_slug,
      'questions', coalesce((select jsonb_agg(to_jsonb(q) - 'created_at' order by q.position) from public.questions q where q.form_id = f.id), '[]'::jsonb))
  end
  from (select * from public.forms where public_slug = p_slug or id::text = p_slug limit 1) f;
$$;

-- Verteilung je auswertbarer Frage (keine Freitexte, keine einzelnen Abgaben)
create or replace function public.public_results(p_slug text)
returns table (question_id uuid, value jsonb, n bigint) language sql stable security definer set search_path = public as $$
  select a.question_id, v.value, count(*)
  from public.forms f
  join public.responses r on r.form_id = f.id
  join public.answers a on a.response_id = r.id
  join public.questions q on q.id = a.question_id and q.type not in ('short_text', 'long_text')
  cross join lateral (select case when jsonb_typeof(a.value) = 'array' then e else a.value end as value
                      from jsonb_array_elements(case when jsonb_typeof(a.value) = 'array' then a.value else '[null]'::jsonb end) e) v
  where (f.public_slug = p_slug or f.id::text = p_slug) and f.status = 'published' and f.settings->>'geloescht' is null
  group by a.question_id, v.value;
$$;

-- Abgabe speichern/ersetzen (idempotent, nur live, nur kurz nach dem Anlegen änderbar)
create or replace function public.submit_response(p_slug text, p_response_id uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_form uuid; v_created timestamptz;
begin
  select id into v_form from public.forms
   where (public_slug = p_slug or id::text = p_slug) and status = 'published' and settings->>'geloescht' is null;
  if v_form is null then raise exception 'Bogen nicht live'; end if;
  insert into public.responses (id, form_id) values (p_response_id, v_form) on conflict (id) do nothing;
  select created_at into v_created from public.responses where id = p_response_id and form_id = v_form;
  if v_created is null or v_created < now() - interval '30 minutes' then raise exception 'Abgabe nicht änderbar'; end if;
  delete from public.answers where response_id = p_response_id;
  insert into public.answers (response_id, question_id, value)
  select p_response_id, (e->>'question_id')::uuid, e->'value'
    from jsonb_array_elements(p_answers) e
    join public.questions q on q.id = (e->>'question_id')::uuid and q.form_id = v_form
   where length((e->'value')::text) <= 4000;
end $$;

grant execute on function public.public_form(text), public.public_results(text), public.submit_response(text, uuid, jsonb) to anon, authenticated;
