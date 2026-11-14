---
name: claus-fragt-bauen
description: Ablauf jeder Bau-Runde im Projekt Claus fragt (Builder für Evaluationsbögen) – vom Lesen der Builder-Box bis zum getesteten PR. Benutzen bei jeder Änderung an Builder, Bogen, Design oder Auswertung.
---

# Bau-Runde Claus fragt

1. **Kontext laden:** `CLAUDE.md`, `brand/BUILDERBOOK.md`, `docs/ARCHITEKTUR.md`, `docs/LEARNINGS.md`.
2. **Branch:** von `main` (oder dem offenen Feature-Branch) einen neuen `feature/<thema>` anlegen.
3. **Bauen nach Regeln:**
   - Aussehen → nur Tokens (`brand/tokens.css`) + Bausteine (`components/ui/` für den Bogen, `components/admin/` für den Builder). Fehlt ein Baustein: neu anlegen und im Builder Book dokumentieren.
   - Keine Browser-Dialoge: `useDialog().confirm/toast` statt confirm/alert, `Select` statt `<select>`, `noValidate` statt `required`.
   - Texte → `brand/copy.ts`.
   - Fragetypen → Registry (Skill `neuer-fragetyp`).
   - Daten → neue Funktion in `lib/data.ts`. Schema nur per Migration, möglichst `settings` (jsonb) nutzen.
   - Komponenten klein halten (< ~150 Zeilen). Logik ohne UI (wie `flow.ts`) separat.
4. **Prüfen:**
   - `rm -rf .next && npx tsc --noEmit && npm run build`
   - `npx next dev -p 3123`, dann `node scripts/visual-test.mjs http://localhost:3123` → muss mit `errors: none` enden (native Dialoge zählen als Fehler).
   - Screenshots in `.shots/` selbst ansehen: Sprechblase sauber? Claus wandert? Editor ruhig?
   - `node scripts/vergleich.mjs start=10-start multiple-choice=11-frage-1 stars=11-frage-2` und `.shots/vergleich-*.png` ansehen (links Prototyp, rechts Umsetzung).
   - Builder auch mobil prüfen (393 px Breite, Vorschau-Button).
   - Testdaten wieder löschen, fremde Bögen nie anfassen.
5. **Learnings** in `docs/LEARNINGS.md` ergänzen (Problem → Regel).
6. **PR** über die GitHub-API, Vercel-Preview abwarten und den Preview-Link mit `visual-test.mjs <preview-url>` testen.
7. **Rückmeldung an Ruwen** (WhatsApp, max. 5 Zeilen): Ergebnis, offene Punkte, Branch, PR, Preview.
