---
name: neuer-fragetyp
description: Einen neuen Fragetyp in Claus fragt ergänzen (z. B. Matrix, Ranking, Smiley-Skala). Benutzen, wenn ein Fragetyp hinzukommt oder sich ändert.
---

# Neuer Fragetyp

1. Datei `question-types/<typ>.tsx` anlegen und ein `QuestionTypeDef` exportieren (siehe `question-types/types.ts`):
   - `kind`, `label` (Name in der Auswahl „Frageart“), `hint` (eine Zeile Erklärung), `defaultBoxTitle` (meist "")
   - `apply(q)`: setzt DB-Typ + Standard-`settings`. Gemeinsame Settings mit `commonSettings(q)` übernehmen.
   - `Input`: Eingabe für Teilnehmende, nur aus Tokens/Bausteinen (`ChoiceList`, `inputs.module.css`).
   - `Editor` (optional): Felder unter der Frageart, im Admin-Look (`editors.module.css`, `Select` aus `components/admin`, kein natives `<select>`).
   - `resultOptions` + ggf. `matches`, wenn auswertbar (dann gibt es automatisch Ergebnis-Screens + Auswertung).
   - `format`: Antwort als Text (CSV).
2. In `question-types/index.ts` in `QUESTION_TYPES` eintragen.
3. Braucht der Typ einen neuen DB-Typ? Nur dann eine Migration (Check-Constraint von `questions.type` erweitern).
   Sonst bestehenden DB-Typ + `settings` nutzen (Beispiel: Sterne = `scale` + `display: "stars"`), siehe `kindOf()`.
4. In `brand/BUILDERBOOK.md` (Tabelle Fragetypen) dokumentieren.
5. `scripts/visual-test.mjs` um den Typ erweitern (`addQuestion("<label>", …)` + Antwort im Ausfüll-Teil).
6. Kein Auto-Weiter: Jede Frage wird mit WEITER! bestätigt.
