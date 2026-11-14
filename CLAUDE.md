# Claus fragt – Anweisungen für Agenten

@AGENTS.md

Evaluationsbögen für InnoNord: Ein **Builder** (Admin) erstellt Bögen, Teilnehmende füllen sie per Link im
Claus-Look (Figma-Prototyp „van der Stein“) aus, und die Ergebnisse dienen dazu, den Wissenstransfer von Event zu Event zu verbessern.

Routen: `/meine-boegen`, `/neu`, `/b/<id>/bearbeiten`, `/b/<id>/ergebnisse`, `/f/<slug>`, `/f/<slug>/qr`.
Art (Inspirierend/Lernend): `brand/themes.ts`. Hinweise/KPI: `lib/rules.ts`, `lib/kpi.ts`. v1-Kompatibilität: `lib/legacy.ts`.

## Zuerst lesen
1. `brand/BUILDERBOOK.md`: Design-System (Farben, Typo, Bausteine, Screens). **Verbindlich.**
2. `docs/ARCHITEKTUR.md`: Ordner, Datenfluss, Erweiterungspunkte.
3. `docs/LEARNINGS.md`: Lehren aus früheren Runden. Neue Learnings am Ende jeder Runde ergänzen.
4. Skills in `.claude/skills/`: `claus-fragt-bauen` (Ablauf jeder Bau-Runde), `neuer-fragetyp`.

## Harte Regeln
- **Farben, Radien, Schriftgrößen nur über `brand/tokens.css`.** Keine Hex-Werte in Komponenten.
- **Texte für Teilnehmende nur über `brand/copy.ts`** (Tonalität kommt später zentral dazu).
- **Datenbank nur über `lib/data.ts`.** Seiten/Komponenten importieren nie `supabase` direkt.
- **Fragetypen nur über die Registry `question-types/`.** Kein `switch (q.type)` in Seiten.
- Teilnehmer-Screens bestehen aus den Bausteinen in `components/ui/`, keine Einzelanfertigungen.
- **Keine Browser-Dialoge** (confirm, alert, prompt, beforeunload, `required`-Blasen, natives `<select>`, `title`-Tooltips).
  Admin nutzt `components/admin/` (`useDialog().confirm/toast`, `Select`, `Switch`). Der Editor speichert automatisch.
- Claus ist auf jedem Fragen-Screen sichtbar; kein Auto-Weiter, immer WEITER!.
- `SurveyPlayer` ist die einzige Darstellung des Bogens (Live-Link **und** Builder-Vorschau).
- Schema-Änderungen nur als neue Datei in `supabase/migrations/`, Ruwen spielt sie ein. Lieber `settings` (jsonb) nutzen als neue Spalten.
- Admin-CSS (`app/globals.css`) wirkt nur in `.admin-main > h1` und `.panel`, damit die Vorschau nicht beeinflusst wird.
- Keine Secrets ins Repo. Publishable Key + URL sind öffentlich (stehen als Fallback in `next.config.ts`).

## Definition of Done (jede Runde)
1. `npx tsc --noEmit` und `npm run build` grün.
2. `npx next dev -p 3123`, dann `node scripts/visual-test.mjs http://localhost:3123` (muss mit `errors: none` enden) und bei Design-Änderungen `node scripts/vergleich.mjs start=11-start multiple-choice=11-frage-1 stars=11-frage-2`.
3. Screenshots in `.shots/vergleich-*.png` mit `docs/prototyp/` vergleichen: Abweichungen beheben oder begründen.
4. Learnings in `docs/LEARNINGS.md` eintragen.
5. Branch + PR, Vercel-Preview abwarten, Preview-Link testen.
