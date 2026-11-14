# Login einrichten (einmalig, Ruwen in Supabase)

Stand 14.11.2026. Die App hat Anmelden per E-Mail-Link (`/anmelden`). Alle Admin-Seiten (Meine Bögen, Editor, Ergebnisse, Tafel, Steuerung)
verlangen die Anmeldung; der Teilnehmer-Link `/f/<slug>` und der QR-Code brauchen keinen Login.

1. **Authentication → URL Configuration**
   - Site URL: `https://claus-fragt-git-feature-builder-v2-ruwenrossow-jpgs-projects.vercel.app` (später die Produktions-URL)
   - Redirect URLs hinzufügen: `https://claus-fragt-*-ruwenrossow-jpgs-projects.vercel.app/**` und `http://localhost:3123/**`
2. **SQL-Editor:** Migration `supabase/migrations/20261114120000_besitzer.sql` ausführen (Spalte `owner_id`, neue Bögen gehören automatisch dem angemeldeten Konto).
3. Anmelden, in „Meine Bögen“ auf **„Zu meinem Konto“** tippen → die Bögen von vor dem Login gehören dir.

Hinweise
- Ohne Schritt 1 führt der Link in der Mail ins Leere (Supabase leitet sonst auf die Site URL, z. B. localhost).
- **Passwort:** Nach der ersten Anmeldung per Link im Konto-Menü (oben rechts) „Passwort festlegen“ – danach „Mit Passwort“ ohne Mail. Supabase schickt ohne SMTP nur ~2 Mails pro Stunde.
- Ohne Schritt 2 funktioniert der Login trotzdem, nur sieht dann jede angemeldete Person alle Bögen.
- Supabase verschickt ohne eigenen Mail-Versand nur wenige Mails pro Stunde und nur an Mitglieder des Supabase-Teams.
  Für weitere Ersteller:innen: **Authentication → Emails → SMTP** (z. B. InnoNord-Postfach).
- Die Datenbank-Rechte (RLS) sind weiterhin offen; das Absichern mit Policies ist Schritt 2 aus `docs/PLAN-LOGIN.md`.
- E2E-Tests überspringen den Login nur auf localhost (`localStorage.claus-e2e = 1`); auf Vercel wirkt das nicht.
