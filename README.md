# Claus fragt
Builder für Evaluationsbögen von InnoNord (Next.js 16 + Supabase, Deployment über Vercel).

- **Builder:** `/` → Bogen anlegen → Fragen bauen, Live-Vorschau im Handy-Rahmen (mobil: Button „Vorschau“)
- **Teilnehmende:** `/f/<id>`: Claus-Look nach Figma-Prototyp (Start → Fragen → Ende → Ergebnis)
- **Auswertung:** `/forms/<id>/results` + CSV

Doku: `CLAUDE.md` (Regeln) · `brand/BUILDERBOOK.md` (Design-System) · `docs/ARCHITEKTUR.md` · `docs/LEARNINGS.md`

## Setup
1. Migrationen aus `supabase/migrations/` im Supabase SQL-Editor ausführen.
2. Optional `.env.local` nach `.env.example` (sonst greifen die öffentlichen Fallbacks in `next.config.ts`).
3. `npm install && npm run dev`
4. Tests: `node scripts/visual-test.mjs http://localhost:3000 && npm run test:vergleich` (braucht Google Chrome)
