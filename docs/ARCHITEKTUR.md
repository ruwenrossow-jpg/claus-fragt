# Architektur

```
app/                      Next.js-Seiten (nur Zusammenbau, keine Logik)
  page.tsx                Übersicht der Bögen (Admin)
  forms/[id]/edit         Builder + Live-Vorschau im Handy-Rahmen
  forms/[id]/results      Auswertung + CSV
  f/[id]                  Öffentlicher Link für Teilnehmende
brand/                    Builder-Box: tokens.css, copy.ts, themes.ts, BUILDERBOOK.md
components/ui/            Bausteine der Bogen-Oberfläche (Prototyp-Look)
components/survey/        SurveyPlayer (Ablauf), flow.ts (Screen-Logik), ResultView
components/builder/       QuestionEditor, PreviewTabs, useFormDraft (Entwurfs-State)
question-types/           Fragetyp-Registry: je Typ Input, Editor, Auswertung, Format
lib/data.ts               EINZIGER Datenbankzugriff (Supabase)
lib/types.ts              Datentypen (Spiegel der Tabellen)
lib/framework.ts          Platzhalter 5-Schritt-Framework
supabase/migrations/      Schema (Ruwen spielt Migrationen ein)
scripts/                  visual-test, vergleich (Prototyp vs. Umsetzung), freistellen
docs/prototyp/            Figma-Referenz-Screens
```

## Datenmodell
`forms` → `questions` (position, step 1–5, type, label, options[], settings{}) → `responses` → `answers` (value jsonb).
- `questions.settings` ist frei erweiterbar (Box-Titel, Skala, Sterne, Platzhalter, Claus-Seite), dafür ist keine Migration nötig.
- `questions.step` ordnet jede Frage einem Schritt des 5er-Frameworks zu. Damit wertet man später pro Schritt aus (KPI Wissenstransfer).
- Sterne sind DB-Typ `scale` mit `settings.display = "stars"`.

## Erweiterungspunkte
| Vorhaben | Wo |
|---|---|
| Neuer Fragetyp | `question-types/<typ>.tsx` + Eintrag in `question-types/index.ts` (Skill `neuer-fragetyp`) |
| Framework (5 Schritte) | `lib/framework.ts`: Builder und CSV lesen automatisch daraus |
| Tonalität | `brand/copy.ts` |
| Neuer Stil | `brand/themes.ts` (+ Assets in `public/brand/`, ggf. Token-Overrides) |
| Neuer Screen im Ablauf | `components/survey/flow.ts` + Fall in `SurveyPlayer` |
| Auswertung je Framework-Schritt | `app/forms/[id]/results` + Helfer in `question-types/index.ts` (`distribution`, `average`) |

## Ablauf Teilnehmende
Start → Fragen → (Speichern) → Ende → Ergebnisse (eigene Antwort vs. alle) → Fertig.
Wer nach dem Speichern zurückgeht und etwas ändert, ersetzt die Antworten derselben Abgabe (`saveResponse` mit responseId) und erzeugt keine doppelte.

## Sicherheit (Hackathon-Modus)
RLS ist offen (kein Login), jede Person mit dem Link kann lesen und schreiben. Vor dem echten Einsatz Auth + Owner-Policies ergänzen.
