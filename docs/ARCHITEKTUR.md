# Architektur

```
app/                      Next.js-Seiten (nur Zusammenbau, keine Logik)
  meine-boegen            Liste: Bearbeiten · Teilen · Ergebnisse · Duplizieren · Löschen (eigener Dialog)   („/“ leitet hierher)
  neu                     Neuer Bogen: Name, Beschreibung, Inspirierend/Lernend → leerer Editor
  b/[id]/bearbeiten       Editor wie Google Forms: Kopf-Karte, Frage-Karten, Autosave, Live-Vorschau, Teilen-Dialog (?teilen=1)
  b/[id]/ergebnisse       Kennzahlen (nur wenn passende Daten da sind), Filter nach Antwort, Auswertung je Frage, CSV
  f/[slug]                Öffentlicher Link (alte /f/<uuid>-Links gehen weiter)
  f/[slug]/qr             QR-Vollbild für den Beamer
brand/                    Builder-Box: tokens.css, copy.ts, themes.ts (Inspirierend/Lernend), BUILDERBOOK.md
components/ui/            Bausteine der Bogen-Oberfläche (Prototyp-Look): SpeechBubble, Mascot, useTween …
components/admin/         Bausteine der Admin-Oberfläche: Dialog/Toast (useDialog), Select, Switch, Icons
components/survey/        SurveyPlayer (Ablauf), flow.ts (Screen-Logik), context.ts (spielbare Fragen, Texte), ResultView
components/builder/       QuestionCard, FormHeadCard, ArtChoice, SaveStatus, ShareDialog, PreviewTabs, useFormDraft (Autosave)
question-types/           Fragetyp-Registry: je Typ Input, Editor, Auswertung, Format
lib/data.ts               EINZIGER Datenbankzugriff (Supabase)
lib/types.ts              Datentypen (Spiegel der Tabellen)
lib/text.ts               fillVars ({event}, {thema}, {anzahl}), wordCount
lib/legacy.ts             Kompatibilität mit v1-Bögen (Beispieltexte leerer Pflicht-Plätze)
lib/rules.ts              Hinweise: Tonalität, zu wenige Antworten, Umfang (warnen statt blockieren)
lib/kpi.ts                Kennzahlen für beliebige Fragen (Stufen, Sterne/Skala, Ja/Nein)
supabase/migrations/      Schema (Ruwen spielt Migrationen ein)
scripts/                  visual-test (E2E), vergleich (Prototyp vs. Umsetzung), freistellen
docs/prototyp/            Figma-Referenz-Screens; docs/screens/v2: Screens Builder v2
```

## Datenmodell
`forms` (title, description, style = inspire|network, settings{}, public_slug, status draft|published(=Live)|closed)
→ `questions` (position, step, type, label, options[], settings{}) → `responses` → `answers` (value jsonb).
- Neue Bögen starten **ohne Fragen**; Reihenfolge = `position`.
- `questions.settings` ist frei erweiterbar (Skala, Sterne, Platzhalter, maxChoices), dafür ist keine Migration nötig.
- Sterne sind DB-Typ `scale` mit `settings.display = "stars"`; Stufen sind `single_choice` mit `display = "levels"` (score = Position 1–4).
- **Framework (offen):** `step`, `settings.slotId`, `settings.kpi` bleiben im Modell und in der CSV, haben aber keine UI.
  Neue Fragen: `step = null`. Ein späteres Framework-Konzept kann darauf aufsetzen.
- v1-Bögen: `settings.ansprache/eventName/thema` werden weiter gelesen; leere Pflicht-Plätze zeigen ihren alten Beispieltext
  (`lib/legacy.ts`), der Editor übernimmt ihn beim Öffnen als echten Text.
- Im Bogen erscheinen nur Fragen mit Text; Auswahlfragen brauchen ≥ 2 nicht leere Antworten (`playableQuestions`).

## Speichern (Autosave)
`useFormDraft` speichert 0,8 s nach der letzten Änderung (`saveForm`: Bogen-Update, gelöschte Fragen, Upsert aller Fragen).
Änderungen während des Speicherns werden danach nachgespeichert (Revisionszähler). Beim Tab-Wechsel/Verlassen wird sofort gespeichert.
Live schalten / Status ändern speichert sofort (`patchForm(patch, true)`). „Speichern & abschließen“ ruft `saveNow()` (wartet laufendes Speichern ab) und öffnet den Teilen-Dialog.

## Erweiterungspunkte
| Vorhaben | Wo |
|---|---|
| Neuer Fragetyp | `question-types/<typ>.tsx` + Eintrag in `question-types/index.ts` (Skill `neuer-fragetyp`) |
| Neue Art / neuer Look | `brand/themes.ts` (+ Tokens) |
| Tonalität / Texte | `brand/copy.ts`, Hinweise in `lib/rules.ts` |
| Kennzahl | `lib/kpi.ts` |
| Bestätigung / Hinweis im Admin | `useDialog()` aus `components/admin/Dialog.tsx` |
| Neuer Screen im Ablauf | `components/survey/flow.ts` + Fall in `SurveyPlayer` |

## Ablauf Teilnehmende
Start → Fragen (jeweils WEITER!) → (Speichern) → Ende → Ergebnisse (eigene Antwort vs. alle) → Fertig.
Ab der ersten Frage hat jeder Screen „Zurück“ (`prevStep` in `flow.ts`, auch Ende/Ergebnis/Fertig).
Wer nach dem Speichern zurückgeht und etwas ändert, ersetzt die Antworten derselben Abgabe (`saveResponse` mit responseId) und erzeugt keine doppelte.

## Sicherheit (Hackathon-Modus)
RLS ist offen (kein Login), jede Person mit dem Link kann lesen und schreiben. Vor dem echten Einsatz Auth + Owner-Policies ergänzen.
