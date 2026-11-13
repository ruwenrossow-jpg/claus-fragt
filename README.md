# claus-fragt
Builder für Evaluationsbögen (Next.js + Supabase, Deployment über Vercel).

## Setup
1. Migration `supabase/migrations/20261113180000_evaluation_builder.sql` im Supabase SQL-Editor ausführen.
2. `.env.local` nach Vorlage `.env.example` anlegen (in Vercel sind die Variablen bereits gesetzt).
3. `npm install && npm run dev`

## Seiten
- `/` Übersicht aller Bögen
- `/forms/[id]/edit` Builder (Fragen, Typen, Pflicht, Reihenfolge, Framework-Schritt, Status)
- `/f/[id]` Bogen ausfüllen (Link zum Teilen)
- `/forms/[id]/results` Auswertung + CSV-Export

## Platzhalter für später
- `lib/framework.ts` 5-Schritt-Frage-Framework (Namen, Beschreibungen, Regeln)
- `lib/styles.ts` auswählbare Stile (Design-Regeln, Progressbar, Maskottchen)
- RLS ist im Hackathon-Modus offen (kein Login). Vor echtem Einsatz Auth + Owner-Policies ergänzen.
