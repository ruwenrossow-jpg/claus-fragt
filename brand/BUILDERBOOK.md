# Builder Book – Claus fragt

Die **Builder-Box** ist der Ordner `brand/` plus die Bausteine in `components/ui/`. Alles, was das Aussehen
bestimmt, liegt hier zentral, damit jede Erweiterung gleich aussieht.

| Datei | Inhalt |
|---|---|
| `brand/tokens.css` | Alle Farben, Schriften, Größen, Radien als CSS-Variablen |
| `brand/copy.ts` | Alle Texte für Teilnehmende (Platzhalter für die Tonalitätsregeln) |
| `brand/themes.ts` | Stile (aktuell „Claus (Weihnachten)“) + Logo-Pfad |
| `public/brand/` | Logo, Maskottchen (froh/traurig, freigestellt) |
| `docs/prototyp/` | Figma-Prototyp als Referenz-Screens (393 × 852) |
| `components/ui/` | Bausteine: Screen, TopBar, SpeechBubble, Mascot, AnswerCard, PillButton |

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
- **SpeechBubble**: Ellipse, 1 px schwarzer Rand, Zipfel `up-left` | `up-right` | `down-right`.
- **MascotHero**: Sprechblase oben, großer Claus darunter (Start, Ende, Fertig, Geschlossen).
- **MascotCorner**: kleiner Claus links/rechts oben, Frage-Sprechblase darunter (Fragen-Screens).
  Seite: `settings.mascotSide`, sonst automatisch abwechselnd (links, rechts, …) wie im Prototyp.
- **AnswerCard**: türkise Box, 2 px schwarzer Rand, Radius 18, min. 242 px hoch, optionaler Titel.
- **PillButton**: rot, 212 × 72, Text in Großbuchstaben mit „!“. **Genau ein Button pro Screen.**

## Screens (Ablauf siehe `components/survey/flow.ts`)
1. **Start**: froher Claus, Begrüßung (`form.description` oder `COPY.startBubble`, `{anzahl}`), START!
2. **Frage** (je Frage): zurück, Fortschritt, Claus in der Ecke, Frage in der Sprechblase, Antwort-Box, WEITER!
3. **Ende**: trauriger Claus, „Oh du bist ja schon fertig …“, voller Balken, ERGEBNIS! (Antworten sind hier schon gespeichert.)
4. **Ergebnis** (je auswertbare Frage): „Frage N / Titel“, „Deine Antwort = A:“, Balken mit % aller Teilnehmenden, eigene Antwort rot.
5. **Fertig**: froher Claus, Dank.

## Fragetypen im Look
| Typ | Box-Titel (Standard) | Darstellung |
|---|---|---|
| Multiple Choice | – | runde Radios, gewählt = Akzent |
| Skala (Zahlen) | „Das ist Ihre Skala:“ | 5 Chips, gewählt = rot, Beschriftung links/rechts |
| Sterne | „Bewerten Sie:“ | 5 Sterne gelb/grau |
| Offene Antwort | „Offene Antwort:“ | Textfeld, Platzhalter „Ihre Antwort hier…“ |
| Mehrfachauswahl, Kurze Antwort, Ja/Nein | siehe Registry | gleiche Bausteine |

## Assets
- Maskottchen als freigestellte PNGs: `claus-froh.png`, `claus-traurig.png` (mit `scripts/freistellen.mjs` aus den JPGs).
  Das frohe Bild stammt aus einem 500-px-JPG, deshalb sind am Rand leichte Reste möglich. **Besser: PNG mit Transparenz direkt aus Figma exportieren.**
- Logo `innonord-logo.jpg` hat einen weißen Hintergrund und gehört deshalb nur auf weiße Flächen (Admin-Kopfzeile).

## Offen / folgt
- Tonalitätsregeln → `brand/copy.ts` (+ ggf. Regeln je Framework-Schritt)
- 5-Schritt-Framework → `lib/framework.ts` (Namen, Beschreibungen, empfohlene Fragetypen)
- Weitere Stile → `brand/themes.ts` (+ Token-Sets je Stil)
