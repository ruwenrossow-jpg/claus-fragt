# Architektur

```
app/                      Next.js-Seiten (nur Zusammenbau, keine Logik)
  meine-boegen            Liste: Bearbeiten · Teilen · Ergebnisse · Duplizieren   („/“ leitet hierher)
  neu                     Neuer Bogen: Event-Kachel → Name/Thema → Editor
  b/[id]/bearbeiten       Editor mit Plätzen je Bereich, Warnungen, Live-Vorschau, Teilen-Dialog (?teilen=1)
  b/[id]/ergebnisse       KPI-Kacheln, Zielgruppen-Filter, Auswertung je Frage, CSV (Langformat)
  f/[slug]                Öffentlicher Link (alte /f/<uuid>-Links gehen weiter)
  f/[slug]/qr             QR-Vollbild für den Beamer
brand/                    Builder-Box: tokens.css, copy.ts, themes.ts, BUILDERBOOK.md
components/ui/            Bausteine der Bogen-Oberfläche (Prototyp-Look)
components/survey/        SurveyPlayer (Ablauf), flow.ts (Screen-Logik), ResultView
components/builder/       QuestionEditor, PreviewTabs, useFormDraft (Entwurfs-State)
question-types/           Fragetyp-Registry: je Typ Input, Editor, Auswertung, Format
lib/data.ts               EINZIGER Datenbankzugriff (Supabase)
lib/types.ts              Datentypen (Spiegel der Tabellen)
lib/framework.ts          5 Bereiche + Platz-Gerüst (Slots), questionsForForm, fillVars
lib/styles.ts             Styles (Inspire/Implement/Network) + Event-Typen mit Vorauswahl
lib/rules.ts              Warnungen: Tonalität, Umfang, KPI-Vergleichbarkeit (warnen statt blockieren)
lib/kpi.ts                Transfer-, Ziel-, Teach-Score, Erlebnis, Lücke
supabase/migrations/      Schema (Ruwen spielt Migrationen ein)
scripts/                  visual-test, vergleich (Prototyp vs. Umsetzung), freistellen
docs/prototyp/            Figma-Referenz-Screens
```

## Datenmodell
`forms` (style, settings{eventTyp, eventName, thema, teach, menti, ansprache}, public_slug, status draft|published(=Live)|closed) → `questions` (position, step 1–5, type, label, options[], settings{}) → `responses` → `answers` (value jsonb).
- `questions.settings` ist frei erweiterbar (Box-Titel, Skala, Sterne, Platzhalter, Claus-Seite), dafür ist keine Migration nötig.
- `questions.step` ordnet jede Frage einem Schritt des 5er-Frameworks zu. Damit wertet man später pro Schritt aus (KPI Wissenstransfer).
- Sterne sind DB-Typ `scale` mit `settings.display = "stars"`; Stufen sind `single_choice` mit `display = "levels"` (score = Position 1–4).
- Platz-Zuordnung: `settings.slotId`, KPI: `settings.kpi` (transfer | ziel | teach).
- Leere optionale Plätze und Auswahlfragen mit < 2 Optionen werden im Bogen weggelassen (`isPlayable`); leere Pflicht-Plätze zeigen das Beispiel.

## Erweiterungspunkte
| Vorhaben | Wo |
|---|---|
| Neuer Fragetyp | `question-types/<typ>.tsx` + Eintrag in `question-types/index.ts` (Skill `neuer-fragetyp`) |
| Platz im Framework | `slotsFor()` in `lib/framework.ts` |
| Event-Typ / Vorauswahl | `EVENT_TYPES` in `lib/styles.ts` |
| Tonalität / Texte | `brand/copy.ts` (du/Sie/Emoji), Regeln in `lib/rules.ts` |
| Neuer Style | `lib/styles.ts` (Ziel-Platz) + `brand/themes.ts` (Ton, Claus, Auto-Weiter) |
| KPI | `lib/kpi.ts` |
| Neuer Screen im Ablauf | `components/survey/flow.ts` + Fall in `SurveyPlayer` |
| Auswertung je Framework-Schritt | `app/forms/[id]/results` + Helfer in `question-types/index.ts` (`distribution`, `average`) |

## Ablauf Teilnehmende
Start → Fragen → (Speichern) → Ende → Ergebnisse (eigene Antwort vs. alle) → Fertig.
Wer nach dem Speichern zurückgeht und etwas ändert, ersetzt die Antworten derselben Abgabe (`saveResponse` mit responseId) und erzeugt keine doppelte.

## Sicherheit (Hackathon-Modus)
RLS ist offen (kein Login), jede Person mit dem Link kann lesen und schreiben. Vor dem echten Einsatz Auth + Owner-Policies ergänzen.
