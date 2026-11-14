# Architektur

```
app/                      Next.js-Seiten (nur Zusammenbau, keine Logik)
  meine-boegen            Liste: Bearbeiten · Teilen · Ergebnisse · Duplizieren · Löschen = Papierkorb   („/“ leitet hierher)
                          ?papierkorb=1 Papierkorb mit Wiederherstellen · ?tests=1 zeigt Testbögen
  neu                     Neuer Bogen: Name, Beschreibung, Inspirierend/Lernend → leerer Editor
  b/[id]/bearbeiten       Editor wie Google Forms: Kopf-Karte, Frage-Karten, Autosave, Live-Vorschau, Teilen-Dialog (?teilen=1)
  b/[id]/ergebnisse       Kennzahlen (nur wenn passende Daten da sind), Filter nach Antwort, Auswertung je Frage, CSV
  f/[slug]                Öffentlicher Link (alte /f/<uuid>-Links gehen weiter)
  f/[slug]/qr             QR-Vollbild für den Beamer
  b/[id]/tafel/steuerung  Steuerung der Tafel (Laptop/Handy): Ablauf, Antworten live vor dem Zeigen, Knöpfe; Fernbedienung des Beamers
  b/[id]/tafel            Tafel (Menti-Modus) für den Beamer (hält den Stand, Knöpfe blenden aus): QR + Zähler „Handys dabei“ → Frage für alle → Antwortzähler →
                          „Zeigen“ → Wortwolke (Freitext) / Balken → nächste Frage; Steuerung auch per Pfeiltasten/Presenter-Klicker
  */layout.tsx            nur Metadaten (Seitentitel, Link-Vorschau) per generateMetadata → formMeta() in lib/data.ts
  not-found, error, global-error   Hinweis-Screens im Claus-Raster (SurveyMessage)
brand/                    Builder-Box: tokens.css, copy.ts, themes.ts (Inspirierend/Lernend), BUILDERBOOK.md
components/ui/            Bausteine der Bogen-Oberfläche (Prototyp-Look): SpeechBubble, Mascot, useTween …
components/admin/         Bausteine der Admin-Oberfläche: Dialog/Toast (useDialog), Select, Switch, Icons
components/survey/        SurveyPlayer (Ablauf), flow.ts (Screen-Logik), context.ts (spielbare Fragen, Texte), ResultView
components/builder/       QuestionCard, FormHeadCard, ArtChoice, SaveStatus, ShareDialog, PreviewTabs, useFormDraft (Autosave)
question-types/           Fragetyp-Registry: je Typ Input, Editor, Auswertung, Format
lib/tafel.ts              Tafel-Abgleich über Supabase Realtime (Broadcast + Presence, keine Tabelle): hostTafel / joinTafel
lib/wordcloud.ts          Freitext → Begriffe mit Häufigkeit (≤ 3 Wörter = ein Begriff, sonst Wörter ohne Füllwörter)
components/tafel/         WordCloud + Beamer-Styles
lib/data.ts               EINZIGER Datenbankzugriff (Supabase); DataError (not_found | offline | other), trashForm/restoreForm
lib/types.ts              Datentypen (Spiegel der Tabellen)
lib/text.ts               fillVars ({event}, {thema}, {anzahl}), wordCount
lib/legacy.ts             Kompatibilität mit v1-Bögen (Beispieltexte leerer Pflicht-Plätze)
lib/rules.ts              Hinweise: Tonalität, zu wenige Antworten, Umfang (warnen statt blockieren)
lib/kpi.ts                Kennzahlen für beliebige Fragen (Stufen, Sterne/Skala, Ja/Nein)
supabase/migrations/      Schema (Ruwen spielt Migrationen ein)
scripts/                  visual-test (E2E aller Journeys), vergleich (Prototyp vs. Umsetzung), freistellen, bilder (WebP/OG/Icons)
docs/prototyp/            Figma-Referenz-Screens; docs/screens/v2: Screens Builder v2
```

## Datenmodell
`forms` (title, description, style = inspire|network, settings{}, public_slug, status draft|published(=Live)|closed)
→ `questions` (position, step, type, label, options[], settings{}) → `responses` → `answers` (value jsonb).
- Neue Bögen starten **ohne Fragen**; Reihenfolge = `position`. Neue Fragen sind standardmäßig Pflicht.
- `questions.settings` ist frei erweiterbar (Skala, Sterne, Platzhalter, maxChoices), dafür ist keine Migration nötig.
- Sterne sind DB-Typ `scale` mit `settings.display = "stars"`; Stufen sind `single_choice` mit `display = "levels"` (score = Position 1–4).
- **Framework (offen):** `step`, `settings.slotId`, `settings.kpi` bleiben im Modell und in der CSV, haben aber keine UI.
  Neue Fragen: `step = null`. Ein späteres Framework-Konzept kann darauf aufsetzen.
- v1-Bögen: `settings.ansprache/eventName/thema` werden weiter gelesen; leere Pflicht-Plätze zeigen ihren alten Beispieltext
  (`lib/legacy.ts`), der Editor übernimmt ihn beim Öffnen als echten Text.
- Im Bogen erscheinen nur Fragen mit Text; Auswahlfragen brauchen ≥ 2 nicht leere Antworten (`playableQuestions`).
- `forms.settings.geloescht` (ISO-Zeit | null): **Soft-Delete**. Gelöschte Bögen bleiben mit Fragen und Antworten vollständig erhalten.
  Es gibt in `lib/data.ts` keine Funktion, die Bögen hart löscht.
- `forms.settings.test` (true): Testbogen aus dem E2E-Test (`/neu?test=1`), in der Liste ausgeblendet; nur solche Bögen dürfen per REST
  hart gelöscht werden, und nur mit `settings->>test=eq.true` + exakter id.

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
Start → Fragen (jeweils WEITER!) → (Speichern) → Ende → Ergebnisse (eigene Antwort vs. alle) → Fertig → „Schließen“ → Tschüss.
„Schließen“ versucht `window.close()` (geht nur bei per Skript geöffneten Fenstern) und zeigt sonst den Tschüss-Screen; in der Builder-Vorschau startet es von vorne.

### Tafel-Modus (Menti)
Ablauf für Ersteller:innen: `docs/TAFEL.md`. Fragen mit `settings.tafel = true` laufen gemeinsam, **wenn** der Beamer `/b/<id>/tafel` offen ist (Steuerung schickt Befehle per Broadcast `cmd`). Die Tafel sendet alle 2 s ihren Stand
(Lobby · Frage x · Ende) über den Realtime-Kanal `tafel-<formId>`; Handys zählen per Presence. Handys, die 7 s nichts hören, gelten als „Tafel aus“.
Handy: Start → Screen „tafel“ (warten · Frage + „Abschicken“ · „Angekommen“ + „Ändern“) → bei Ende/Tafel weg: „Das war der gemeinsame Teil“ + WEITER!
→ übrige Fragen allein (+ verpasste Pflichtfragen der Tafel) → Ende … Jedes „Abschicken“ speichert die Abgabe (idempotent, gleiche Abgabe-id).
Ohne laufende Tafel sind Tafel-Fragen ganz normale Fragen. Die Tafel zählt nur Abgaben ab ihrem Start (`loadAnswersSince`), alte Events tauchen nicht auf.
Ihr Stand liegt im localStorage der Moderation („Neu starten“ setzt ihn zurück).
Ab der ersten Frage hat jeder Screen „Zurück“ (`prevStep` in `flow.ts`, auch Ende/Ergebnis/Fertig).
Die Seite erzeugt **einmal** eine Abgabe-id (`newResponseId`); `saveResponse` ist idempotent (Upsert der Abgabe, Antworten ersetzen).
Dadurch erzeugen Zurück + Ändern, Doppeltipp und „nochmal versuchen“ nach einem Netzfehler nie eine zweite Abgabe.
Der Live-Link lädt für die Ergebnis-Screens nur die Antworten der auswertbaren Fragen (`loadAnswers(formId, questionIds)`), keine Freitexte.
Status: nur `published` nimmt Antworten an; Entwurf/Geschlossen/Gelöscht zeigen Hinweis-Screens.

## Sicherheit (Hackathon-Modus)
RLS ist offen (kein Login), jede Person mit dem Link kann lesen und schreiben. Vor dem echten Einsatz Auth + Owner-Policies ergänzen:
Plan in `docs/PLAN-LOGIN.md`, SQL-Entwurf (nicht ausführen!) in `docs/login-entwurf.sql`. Stand für den Einsatz: `docs/READY-CHECK.md`.
Bekannte Grenze: Ein offener Editor schreibt beim Speichern `settings` komplett – wird der Bogen parallel in einem anderen Tab
gelöscht, kann ihn der Editor wieder sichtbar machen (Editor zeigt bei gelöschten Bögen einen Hinweis mit „Wiederherstellen“).
