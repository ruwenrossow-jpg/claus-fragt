# Builder Book – Claus fragt

Die **Builder-Box** ist der Ordner `brand/` plus die Bausteine in `components/ui/`. Alles, was das Aussehen
bestimmt, liegt hier zentral, damit jede Erweiterung gleich aussieht.

| Datei | Inhalt |
|---|---|
| `brand/tokens.css` | Alle Farben, Schriften, Größen, Radien als CSS-Variablen |
| `brand/copy.ts` | Alle Texte für Teilnehmende (Platzhalter für die Tonalitätsregeln) |
| `brand/themes.ts` | Art des Events: Inspirierend / Lernend (Ton, Emojis, Maskottchen) + Logo-Pfad |
| `public/brand/` | Logo, Maskottchen (froh/traurig, freigestellt) |
| `docs/prototyp/` | Figma-Prototyp als Referenz-Screens (393 × 852) |
| `components/ui/` | Bogen-Bausteine: Screen, TopBar, SpeechBubble, Mascot, AnswerCard, PillButton |
| `components/admin/` | Admin-Bausteine: Dialog/Toast (`useDialog`), Select, Switch, Icons |

## Farben
| Token | Wert | Verwendung |
|---|---|---|
| `--inno-red` | `#e3000b` | Haupt-Button, eigene Antwort im Ergebnis, gewählter Skalenwert |
| `--inno-navy` | `#272a87` | Admin-Überschriften, Links (InnoNord-Logo-Blau) |
| `--survey-bg` | `#bffaff` | Hintergrund aller Bogen-Screens |
| `--survey-card` | `#9ee6ef` | Antwort-Box |
| `--survey-field` | `#7abdc7` | Texteingabe-Feld |
| `--survey-accent` | `#457f8c` | Fortschritt, gewähltes Radio, Skalen-Chips, Ergebnisbalken |
| `--survey-accent-light` | `#55b8cd` | Fortschritt-/Balken-Hintergrund |
| `--survey-bubble` | `#dcdcdc` | Sprechblase |
| `--survey-neutral` | `#d9d9d9` | leere Radios/Sterne |
| `--survey-star` | `#edc305` | gefüllte Sterne |

Die Werte sind pixelgenau aus den Prototyp-PNGs und dem InnoNord-Logo ausgelesen.

## Typografie
- **InnoNord-Website:** Source Sans Pro (Fließtext, Buttons). Daneben werden Exo 2 und Maven Pro geladen, aber kaum genutzt.
- **InnoNord-Logo:** fette Slab-Serif. Die nächste freie Schrift ist **Zilla Slab** (Annäherung, nicht verifiziert).
- **Figma-Prototyp:** Inter (vermutlich der Figma-Standard, keine bewusste Wahl).
- **Entscheidung:** `--font-body` = **Source Sans 3** (Nachfolger von Source Sans Pro) für alle Bogen-Texte und das Admin.
  `--font-display` = **Zilla Slab** nur für Admin-Überschriften. Geladen über `next/font` in `app/layout.tsx`.
- Größen: `--text-s` 16, `--text-m` 20 (Fragen, Optionen), `--text-l` 24 (Box-Titel), `--text-xl` 30 (Ergebnis-Titel), `--text-button` 34.

## Bausteine (components/ui)
- **Screen**: Rahmen 393 × 852 (max. 430 px breit), Hintergrund türkis, Footer mit Button unten (60 px Abstand).
- **TopBar**: „< zurück“ (optional) + Fortschrittsbalken (34 px hoch, Pill).
- **SpeechBubble**: Ellipse, 1 px schwarzer Rand, Zipfel `tail="up" | "down"` mit Spitze bei `tailX` (0–1).
  Ellipse und Zipfel sind **ein SVG-Pfad** (nahtlos). Die Ellipse wird um den gemessenen Text berechnet
  (Textbox × √2), deshalb wird nichts abgeschnitten; ab 90 Zeichen 18 px statt 20 px. Kurze Texte: mind. 250 px breit.
- **MascotHero**: Sprechblase oben, großer Claus darunter (Start, Ende, Fertig, Geschlossen).
- **MascotCorner**: Claus oben, Frage-Sprechblase darunter. **Auf jedem Fragen-Screen, nicht abschaltbar.**
  Abwechselnd links/rechts (gerade Frage-Nr. links). Das Element bleibt zwischen den Fragen erhalten, Claus wandert
  per CSS-Transition (0,7 s) mit kleinem Hüpfer, der Zipfel gleitet mit (`useTween`, gleiche Dauer). `prefers-reduced-motion` schaltet das ab.
- **AnswerCard**: türkise Box, 2 px schwarzer Rand, Radius 18, min. 242 px hoch, optionaler Titel.
- **PillButton**: rot, 212 × 72, Text in Großbuchstaben mit „!“. **Genau ein Button pro Screen.**
  Fragen-Screens haben **immer** WEITER! – kein Auto-Weiter (Teilnehmende sollen nachdenken können).

## Screens (Ablauf siehe `components/survey/flow.ts`)
1. **Start**: froher Claus mit Begrüßung, Titel, Untertitel = Beschreibung des Bogens (sonst Standardtext), Chips, „Los geht's“.
2. **Frage** (je Frage): zurück, Fortschritt, Claus (wandert), Frage in der Sprechblase, Antwort-Box, WEITER!
3. **Ende**: trauriger Claus, „Oh du bist ja schon fertig …“, voller Balken, ERGEBNIS! (Antworten sind hier schon gespeichert.)
4. **Ergebnis** (je auswertbare Frage): „Frage N / Titel“, „Deine Antwort = A:“, Balken mit % aller Teilnehmenden, eigene Antwort rot.
5. **Fertig**: froher Claus, Dank.

## Fragetypen im Look
| Typ | Box-Titel (Standard) | Darstellung |
|---|---|---|
| Auswahl | – | runde Radios, gewählt = Akzent |
| Mehrfachauswahl | – | eckige Kästchen, optional „Höchstens N“ |
| Stufen | – | 4 Zeilen mit Signalbalken rechts |
| Sterne | – | 3–6 Sterne gelb/grau |
| Skala | – | Zahlen-Chips, gewählt = rot, Beschriftung links/rechts |
| Ja / Nein, Text (kurz), Text (Absatz) | – | gleiche Bausteine |
Box-Überschriften gibt es nur noch bei v1-Bögen (`settings.boxTitle`), neu werden keine angelegt.

## Assets
- Maskottchen als freigestellte PNGs: `claus-froh.png`, `claus-traurig.png` (mit `scripts/freistellen.mjs` aus den JPGs).
  Das frohe Bild stammt aus einem 500-px-JPG, deshalb sind am Rand leichte Reste möglich. **Besser: PNG mit Transparenz direkt aus Figma exportieren.**
- Logo `innonord-logo.jpg` hat einen weißen Hintergrund und gehört deshalb nur auf weiße Flächen (Admin-Kopfzeile).

## Art & Ton (Builder v2)
| Art (`forms.style`) | Ansprache | Emojis |
|---|---|---|
| Inspirierend (`inspire`) | du | ja |
| Lernend (`network`) | du | nein |
Alte Bögen: `implement` läuft als Lernend; `settings.ansprache = "Sie"` wird weiter respektiert. Texte: `brand/copy.ts`.
Fortschritt: Prozent + Label („Los geht's!“, „Halbzeit!“, „Letzte Frage!“). Freiwillige Fragen zeigen „Freiwillig“, WEITER! geht dann auch ohne Antwort.

## Admin-Oberfläche (Builder v2)
- **Ruhig wie Google Forms**: weiße Karten (`--radius-admin`, `--admin-shadow`), aktive Karte nur über Schatten (`--admin-shadow-active`), kein farbiger Rand.
- Kopf-Karte mit navy Oberkante: Name (Zilla Slab), Beschreibung, Umschalter Inspirierend/Lernend.
- Frage-Karte: inaktiv = Zusammenfassung (Text, Frageart, Antworten); aktiv = Fragetext, Auswahl „Frageart“, Felder der Art, Fuß mit ↑ ↓ Duplizieren Löschen | Pflicht-Schalter.
- **Keine Browser-Dialoge**: `confirm()`, `alert()`, `prompt()`, `beforeunload`, `required`, natives `<select>` und `title`-Tooltips sind tabu.
  Stattdessen `useDialog().confirm(...)` / `.toast(...)`, `Select`, `Switch` aus `components/admin/`, Formulare mit `noValidate` + eigener Meldung.
- Autosave mit Statusanzeige „Speichert …“ / „Gespeichert“ in der Kopfzeile, kein Speichern-Knopf.

## Offen / folgt
- Tonalitätsregeln → `brand/copy.ts` + Hinweise in `lib/rules.ts`
- Framework/KPI-Konzept (Ruwen): Datenmodell hält `step`, `settings.slotId`, `settings.kpi` bereit, ohne UI
- Weitere Arten/Looks → `brand/themes.ts` (+ Token-Sets je Art)
