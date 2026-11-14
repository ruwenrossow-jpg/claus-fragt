# Builder Book – Claus fragt

Die **Builder-Box** ist der Ordner `brand/` plus die Bausteine in `components/ui/`. Alles, was das Aussehen
bestimmt, liegt hier zentral, damit jede Erweiterung gleich aussieht.

| Datei | Inhalt |
|---|---|
| `brand/tokens.css` | Alle Farben, Schriften, Größen, Radien als CSS-Variablen |
| `brand/copy.ts` | Alle Texte für Teilnehmende (Platzhalter für die Tonalitätsregeln) |
| `brand/themes.ts` | Art des Events: Inspirierend / Lernend (Ton, Emojis, Maskottchen) + Logo-Pfad |
| `public/brand/` | Logo, Maskottchen (froh/traurig, freigestellt, WebP in Anzeigegröße), Link-Vorschau `og.png` |
| `docs/prototyp/` | Figma-Prototyp als Referenz-Screens (393 × 852) |
| `components/ui/` | Bogen-Bausteine: Screen, TopBar, SpeechBubble, Mascot, AnswerCard, PillButton |
| `components/admin/` | Admin-Bausteine: Dialog/Toast (`useDialog`), Select, Switch, Icons, PageState |
| `components/survey/SurveyMessage.tsx` | Hinweis-Screen im Bogen-Raster (Laden, gibt es nicht mehr, keine Verbindung, 404, Fehler) |

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

## Layout-Raster der Bogen-Screens (verbindlich)
**Jeder** Bogen-Screen (Start, Fragen, Ende, Ergebnis, Danke, Geschlossen) ist derselbe `<Screen>` mit vier Zonen (CSS-Grid):

| Zone | Höhe (393 × 852) | Inhalt |
|---|---|---|
| Kopf | `--zone-head` 120 px | „< Zurück“ + Fortschritt (Platz bleibt reserviert, auch wenn leer) |
| Bühne | `--space-2` + `--claus-size` 116 + `--zone-tail` 38 + `--bubble-h` 150 | Claus (wandert) + Sprechblase (fest) |
| Inhalt | Rest (`1fr`) | Antwort-Box, Ergebnis, Texte – **scrollt in sich**, Verlauf unten zeigt Überlauf |
| Fuß | Hinweiszeile (22 px, immer reserviert) + `--pill-h` 72 + `--foot-pad` 40 | Haupt-Button, unten verankert |

- Der Haupt-Button sitzt dadurch auf jedem Screen **pixelgenau gleich hoch**; Screens ohne Button (Danke, Geschlossen) halten den Platz mit `PillSpacer`.
- Kleine Screens (Höhe < 760 px, z. B. 375 × 667) bekommen per `@container` kompaktere Zonen; die Verhältnisse bleiben gleich.
- Gemessen im E2E-Test (`boundingBox`, Abweichung 0 px über alle Screens):

| Viewport | y Button | y Sprechblase |
|---|---|---|
| 393 × 852 | 740 | 282 |
| 375 × 667 | 587 | 226 |
| 430 × 932 | 820 | 282 |
| 320 × 640 | 560 | 226 |

## Gestalt-Regeln im Bogen
- **Nähe:** Was zusammengehört, steht eng (Frage + Hinweis „Freiwillig“ in der Blase; Option + Beschriftung), Zonen sind durch größere Abstände getrennt (`--space-5`/`--space-6`).
- **Ähnlichkeit:** Gleiche Rolle = gleiche Form und Farbe: alle Antworten als Radios/Kästchen gleicher Größe, ein einziger roter Button, eigene Antwort im Ergebnis immer rot.
- **Gemeinsame Region:** Alle Antworten liegen in der türkisen Antwort-Box (2 px Rand). Bei 4+ Optionen wird der Abstand kleiner (`--space-4`), damit die Box ganz sichtbar bleibt.
- **Ausrichtung:** Alle Zonen hängen an derselben linken/rechten Achse (`--screen-pad` 24 px); Blase, Box und Button sind mittig.
- **Spacing-Skala:** nur `--space-1` … `--space-7` (4 · 8 · 12 · 16 · 24 · 32 · 48 px) aus `tokens.css`.
- **Kontinuität:** Fortschritt, Blase und Button stehen auf jedem Screen an derselben Stelle; nur Claus und der Zipfel wandern (0,7 s, gleiche Kurve) – das Auge folgt der Bewegung statt neu zu suchen.
- **Zurück überall:** Ab der ersten Frage hat jeder Screen „< Zurück“, auch Ende, Ergebnis und Danke.

## Bausteine (components/ui)
- **Screen**: das Raster oben (Kopf · Bühne · Inhalt · Fuß), max. 430 px breit, Hintergrund türkis.
- **TopBar**: „< Zurück“ (optional) + Fortschrittsbalken (34 px hoch, Pill) mit Label und Prozent.
- **Stage** (`Mascot.tsx`): Claus oben, darunter die Sprechblase. **Auf jedem Screen, nicht abschaltbar.**
  Claus steht links/rechts (Fragen abwechselnd) oder mittig (Start, Ende, Danke). Das Element bleibt über alle Screens erhalten,
  Claus wandert per CSS-Transition (0,7 s) mit kleinem Hüpfer, der Zipfel gleitet mit (`useTween`, gleiche Dauer). `prefers-reduced-motion` schaltet das ab.
- **SpeechBubble**: Ellipse in voller Breite mit **fester Höhe** `--bubble-h`, 1 px schwarzer Rand; Ellipse und Zipfel sind **ein SVG-Pfad** (nahtlos).
  Die Blase steht immer an derselben Stelle; nur die Zipfelspitze wandert. Text vertikal zentriert, Schrift in Stufen
  `--bubble-font-1` … `-7` (20 → 12 px), bis der Text ins einbeschriebene Rechteck (Breite/√2 × Höhe/√2) passt.
  Die Stufen 6–7 (und etwas mehr Breite) sind nur die Notbremse für sehr lange Fragen; der Editor warnt ab 110 Zeichen.
- **AnswerCard**: türkise Box, 2 px schwarzer Rand, Radius 18, optionaler Titel (nur v1).
- **PillButton**: rot, min. 212 × 72, Text in Großbuchstaben mit „!“. **Genau ein Button pro Screen**, immer im Fuß.
  Fragen-Screens haben **immer** WEITER! – kein Auto-Weiter (Teilnehmende sollen nachdenken können).

## Screens (Ablauf siehe `components/survey/flow.ts`)
1. **Start**: froher Claus mit Begrüßung, Titel, Untertitel = Beschreibung des Bogens (sonst Standardtext), Chips, „Los geht's“.
2. **Frage** (je Frage): zurück, Fortschritt, Claus (wandert), Frage in der Sprechblase, Antwort-Box, WEITER!
3. **Ende**: trauriger Claus, „Oh du bist ja schon fertig …“, voller Balken, ERGEBNIS! (Antworten sind hier schon gespeichert.)
4. **Ergebnis** (je auswertbare Frage): „Frage N / Titel“, „Deine Antwort = A:“, Balken mit % aller Teilnehmenden, eigene Antwort rot.
5. **Fertig**: froher Claus, Dank, „< Zurück“ zum letzten Ergebnis.
6. **Hinweis-Screens** (gleiches Raster, Button-Platz bleibt): Entwurf („noch nicht live“), Geschlossen, Gelöscht/falscher Link
   („gibt es nicht mehr“), Laden („Einen Moment …“), keine Verbindung (mit „Nochmal“), 404 („Hier ist nichts.“), Fehlerseite.
   Live-Link nimmt nur bei Status Live Antworten an; die Builder-Vorschau zeigt den Bogen immer.
- **Doppeltipp-Schutz:** 400 ms nach jedem Screen-Wechsel ignoriert der Haupt-Button Klicks; Speichern ist zusätzlich gesperrt, solange es läuft.
- **Fehler beim Speichern:** Hinweis über dem Button („Speichern ging nicht …“), Screen bleibt, erneut WEITER! tippen speichert dieselbe Abgabe.
Nach dem Speichern zurückgehen und ändern ersetzt die Antworten derselben Abgabe (keine doppelte).

## Fragetypen im Look
| Typ | Box-Titel (Standard) | Darstellung |
|---|---|---|
| Auswahl | – | runde Radios, gewählt = Akzent |
| Mehrfachauswahl | – | eckige Kästchen, optional „Höchstens N“ |
| Stufen | – | 4 Zeilen mit Signalbalken rechts |
| Sterne | – | 3–6 Sterne gelb/grau |
| Skala | – | Zahlen-Chips, gewählt = rot, Beschriftung links/rechts |
| Ja / Nein, Text (kurz), Text (Absatz) | – | gleiche Bausteine; Freitext max. 300 / 2000 Zeichen |
| Skala mit ≥ 8 Stufen (z. B. 0–10) | – | Zahlenfelder 40 px in zwei Reihen statt Überlauf |
Box-Überschriften gibt es nur noch bei v1-Bögen (`settings.boxTitle`), neu werden keine angelegt.

## Assets
- Maskottchen als freigestellte PNGs: `claus-froh.png`, `claus-traurig.png` (mit `scripts/freistellen.mjs` aus den JPGs).
  Im Bogen werden die **WebP-Varianten** (440 px, ≈ 25 KB) geladen; neu erzeugen mit `node scripts/bilder.mjs`
  (auch Logo 360 px, `app/apple-icon.png`, `public/brand/og.png` für die Link-Vorschau).
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
- Autosave mit Statusanzeige „Speichert …“ / „Gespeichert“ in der Kopfzeile (`data-save` für Tests).
- **Meine Bögen:** Löschen = „In den Papierkorb“ (eigener Dialog, Toast mit „Rückgängig“). Papierkorb unter `?papierkorb=1`
  mit „Wiederherstellen“; Testbögen nur mit `?tests=1` (graues „Test“-Etikett).
- **Seitenzustände** (`PageState`): Laden, „Diesen Bogen gibt es nicht.“, Fehler mit „Nochmal versuchen“ – immer mit Kopfzeile und Weg zurück.
- **Tastatur:** Dialoge halten den Fokus und geben ihn zurück; `Select` mit Pfeiltasten/Enter/Esc; sichtbarer Fokus (`:focus-visible`).
- **Haupt-CTA „Speichern & abschließen“** (InnoNord-Rot, `btn primary`) in der Kopfzeile (Handy: „Abschließen“) und am Ende der Fragenliste:
  speichert sofort (wartet auch ein laufendes Speichern ab) und öffnet den Teilen-Dialog mit „Live schalten“.
- **„+ Frage“ / Duplizieren:** neue Karte wird aktiv, scrollt sanft in die Bildschirmmitte (`scrollIntoView({block:"center"})`),
  Cursor im Fragetext, die Vorschau springt auf diese Frage (mit Platzhaltern, solange Text/Antworten fehlen).
- **Vorschau „↺ Von vorne“** (Desktop und mobile Vorschau): setzt Screen und Antworten zurück (`key`-Remount des SurveyPlayer).

## Offen / folgt
- Tonalitätsregeln → `brand/copy.ts` + Hinweise in `lib/rules.ts`
- Framework/KPI-Konzept (Ruwen): Datenmodell hält `step`, `settings.slotId`, `settings.kpi` bereit, ohne UI
- Weitere Arten/Looks → `brand/themes.ts` (+ Token-Sets je Art)
