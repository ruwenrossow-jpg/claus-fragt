-- Claus fragt: Framework-Konfiguration je Bogen + kurzer öffentlicher Link
-- settings: { eventTyp, eventName, thema, teach, menti, ansprache }  (Stil steht weiter in forms.style)
alter table public.forms add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.forms add column if not exists public_slug text unique;
