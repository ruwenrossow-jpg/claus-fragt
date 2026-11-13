---
name: claus-fragt-bauen
description: Ablauf jeder Bau-Runde im Projekt Claus fragt (Builder für Evaluationsbögen) – vom Lesen der Builder-Box bis zum getesteten PR. Benutzen bei jeder Änderung an Builder, Bogen, Design oder Auswertung.
---

# Bau-Runde Claus fragt

1. **Kontext laden:** `CLAUDE.md`, `brand/BUILDERBOOK.md`, `docs/ARCHITEKTUR.md`, `docs/LEARNINGS.md`.
2. **Branch:** von `main` (oder dem offenen Feature-Branch) einen neuen `feature/<thema>` anlegen.
3. **Bauen nach Regeln:**
   - Aussehen → nur Tokens (`brand/tokens.css`) + Bausteine (`components/ui/`). Fehlt ein Baustein: neu in `components/ui/` anlegen und im Builder Book dokumentieren.
   - Texte → `brand/copy.ts`.
   - Fragetypen → Registry (Skill `neuer-fragetyp`).
   - Daten → neue Funktion in `lib/data.ts`. Schema nur per Migration, möglichst `settings` (jsonb) nutzen.
   - Komponenten klein halten (< ~150 Zeilen). Logik ohne UI (wie `flow.ts`) separat.
4. **Prüfen:**
   - `npx tsc --noEmit && npm run build`
   - `npm run dev`, dann `node scripts/visual-test.mjs http://localhost:3000` → muss mit `errors: none` enden.
   - `npm run test:vergleich` und die Bilder `.shots/vergleich-*.png` ansehen (links Prototyp, rechts Umsetzung).
   - Builder auch mobil prüfen (393 px Breite, Vorschau-Button).
   - Testdaten wieder löschen, fremde Bögen nie anfassen.
5. **Learnings** in `docs/LEARNINGS.md` ergänzen (Problem → Regel).
6. **PR** über die GitHub-API, Vercel-Preview abwarten und den Preview-Link mit `visual-test.mjs <preview-url>` testen.
7. **Rückmeldung an Ruwen** (WhatsApp, max. 5 Zeilen): Ergebnis, offene Punkte, Branch, PR, Preview.
