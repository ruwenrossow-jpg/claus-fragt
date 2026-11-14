# Plan: Login und Konten für Ersteller:innen

Stand 14.11.2026. **Noch nicht umgesetzt.** Dafür braucht es Ruwens Supabase-Einstellungen und eine Migration.
Der SQL-Entwurf liegt bewusst in `docs/login-entwurf.sql` (nicht in `supabase/migrations/`), damit ihn niemand versehentlich ausführt.

## Ziel
- Ersteller:innen melden sich per **Magic Link** (E-Mail, kein Passwort) an und sehen nur **ihre** Bögen.
- Teilnehmende brauchen weiter **keinen** Login: Link öffnen, ausfüllen, Ergebnis sehen.
- Niemand kann über den öffentlichen Schlüssel fremde Bögen ändern, löschen oder Freitext-Antworten anderer lesen.

## Heute (Hackathon-Modus)
RLS ist an, aber alle Policies erlauben `anon` alles (`using (true)`). Jede Person mit dem Publishable Key
(steht im Browser) kann jede Tabelle lesen, ändern und löschen. Das Soft-Delete in der App schützt nur vor
Bedienfehlern, nicht vor Absicht. **Deshalb ist Login die wichtigste offene Aufgabe vor einem breiten Einsatz.**

## Datenmodell
- `forms.owner_id uuid references auth.users(id)` (nullable während der Umstellung, danach `not null` + Default `auth.uid()`).
- Index `forms_owner_idx (owner_id)`.
- Fragen, Antworten, Abgaben hängen über `form_id` am Bogen; ihre Rechte leiten sich vom Bogen ab.
- Optional später: Tabelle `form_members (form_id, user_id, rolle)` für geteilte Bögen im Team.

## RLS-Policies (Kurzfassung, Details im SQL-Entwurf)
| Tabelle | Lesen | Schreiben |
|---|---|---|
| `forms` | Eigentümer:in | Eigentümer:in (insert mit `owner_id = auth.uid()`, update; **kein delete** – Soft-Delete über `settings.geloescht`) |
| `questions` | Eigentümer:in des Bogens | Eigentümer:in des Bogens |
| `responses` | Eigentümer:in des Bogens | `anon` darf **nur insert**, wenn der Bogen live und nicht gelöscht ist |
| `answers` | Eigentümer:in des Bogens | `anon` darf insert/delete nur für die eigene, frische Abgabe (über RPC, s. u.) |

Teilnehmende lesen **nie direkt** aus den Tabellen, sondern über zwei RPC-Funktionen (`security definer`):

1. `public_form(slug text)` → Bogen (nur Felder für die Anzeige) + Fragen, **nur wenn** `status = 'published'`
   und `settings->>'geloescht'` leer ist. Für Entwurf/Geschlossen kommt nur der Status zurück (für die Hinweis-Screens).
2. `public_results(slug text)` → Verteilung je auswertbarer Frage (Anzahl je Option), **keine Freitexte**,
   keine einzelnen Abgaben. Ersetzt `loadAnswers` auf dem öffentlichen Link.
3. `submit_response(slug text, response_id uuid, answers jsonb)` → legt die Abgabe an bzw. ersetzt ihre Antworten
   (idempotent wie heute `saveResponse`), prüft Live-Status, Fragen-ids und Größen (z. B. Freitext ≤ 2000 Zeichen).
   Ändern ist nur kurz nach dem Anlegen erlaubt (z. B. 30 Minuten), damit fremde response-ids nicht missbraucht werden.

## Migration der bestehenden Bögen
1. Spalte `owner_id` anlegen (nullable).
2. Ruwen meldet sich einmal per Magic Link an → sein `auth.users.id` steht fest.
3. Alle vorhandenen Bögen (u. a. „Hackathon Flensburg Evaluation“) bekommen per einmaligem Update `owner_id = <Ruwens id>`
   (Statement im SQL-Entwurf, mit seiner id einzusetzen). Nichts wird gelöscht.
4. Erst danach die offenen Hackathon-Policies löschen und die neuen anlegen.
5. Sicherung vorher und nachher mit `_sicherung/sichern.sh`.

## Änderungen in der App
- `lib/supabase.ts`: Session im Browser (supabase-js `auth`), `lib/data.ts` bleibt einziger Datenzugriff.
- Neue Seite `/anmelden` (E-Mail-Feld + „Link schicken“, eigener Hinweis statt Browser-Dialog) und `/auth/callback`.
- `proxy.ts` (Next 16, früher Middleware) leitet Admin-Routen (`/meine-boegen`, `/neu`, `/b/*`) ohne Session nach `/anmelden`.
- `createForm` setzt `owner_id` (oder DB-Default `auth.uid()`).
- `/f/<slug>` nutzt `public_form`, `submit_response`, `public_results` statt direkter Tabellenzugriffe.
- Kopfzeile: Konto-Menü mit „Abmelden“.
- E2E-Test: Testkonto (eigene E-Mail-Adresse), Login per Admin-API-Link oder Testsession.

## Was Ruwen in Supabase einstellen muss
1. **Authentication → Sign In / Providers → Email**: aktiv, „Confirm email“ an, Magic Link erlaubt; „Allow new users to sign up“
   nach Wunsch (offen oder nur eingeladene Personen).
2. **Authentication → URL Configuration**:
   - Site URL: die Produktions-URL (z. B. `https://claus-fragt.vercel.app`).
   - Redirect URLs: `https://claus-fragt.vercel.app/auth/callback`, `https://claus-fragt-git-*-ruwenrossow-jpgs-projects.vercel.app/auth/callback`
     (Previews), `http://localhost:3123/auth/callback`.
3. **Authentication → Emails → SMTP**: eigener Absender (z. B. über das InnoNord-Postfach), sonst gilt das sehr kleine Supabase-Limit
   für E-Mails pro Stunde.
4. **Authentication → Rate Limits** prüfen (Magic Links pro Stunde).
5. Danach die Migration aus `docs/login-entwurf.sql` (nach Prüfung) als neue Datei in `supabase/migrations/` übernehmen und einspielen.

## Aufwand (Schätzung)
| Teil | Aufwand |
|---|---|
| Migration (owner_id, Policies, 3 RPCs) + Test gegen Kopie | 0,5–1 Tag |
| Anmelden-Seite, Callback, Proxy, Konto-Menü | 0,5 Tag |
| Öffentlicher Link auf RPCs umstellen | 0,5 Tag |
| E2E-Test mit Login, Doku, Review mit Ruwen | 0,5 Tag |
| **Summe** | **2–2,5 Tage** |
