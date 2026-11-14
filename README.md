# Claus fragt
Builder für Evaluationsbögen von InnoNord (Next.js 16 + Supabase, Deployment über Vercel).

- **Builder:** `/meine-boegen` → `/neu` → `/b/<id>/bearbeiten` (Autosave, Live-Vorschau im Handy-Rahmen, mobil: „Vorschau“)
- **Teilnehmende:** `/f/<slug>`: Claus-Look nach Figma-Prototyp (Start → Fragen → Ende → Ergebnis), Beamer: `/f/<slug>/qr`
- **Auswertung:** `/b/<id>/ergebnisse` + CSV · **Papierkorb:** `/meine-boegen?papierkorb=1` (Löschen ist immer umkehrbar)

Doku: `CLAUDE.md` (Regeln) · `brand/BUILDERBOOK.md` (Design-System) · `docs/ARCHITEKTUR.md` · `docs/LEARNINGS.md` ·
`docs/READY-CHECK.md` (was für den echten Einsatz fehlt) · `docs/PLAN-LOGIN.md` (Login-Plan)

## Setup
1. Migrationen aus `supabase/migrations/` im Supabase SQL-Editor ausführen.
2. Optional `.env.local` nach `.env.example` (sonst greifen die öffentlichen Fallbacks in `next.config.ts`).
3. `npm install && npm run dev`
4. Tests: `npx next dev -p 3123` und `node scripts/visual-test.mjs http://localhost:3123` (braucht Google Chrome; legt nur
   Testbögen mit `settings.test` an und löscht genau diese wieder)
