# Learnings

Neue Einträge oben. Format: Datum – Problem → Lösung/Regel.

- 2026-11-14 (v2): Sprechblase als CSS-Ellipse + aufgesetztes Zipfel-SVG hatte Nahtstellen und schnitt lange Texte ab → Ellipse und Zipfel als EIN SVG-Pfad, Größe aus dem gemessenen Text (Textbox × √2, ResizeObserver). Maße mit `offsetWidth` lesen, das ignoriert CSS-`zoom` (Handy-Rahmen).
- 2026-11-14 (v2): Animation zwischen zwei Screens braucht dasselbe DOM-Element → gleiche Komponente an gleicher Stelle im Baum rendern (kein `key`, kein Wechsel zwischen Varianten), Seite nur per Klasse umschalten. SVG-Pfade lassen sich nicht per CSS überblenden → Wert in JS tweenen (`useTween`), gleiche Dauer wie die CSS-Transition.
- 2026-11-14 (v2): Hüpfer bei jedem Seitenwechsel: zwei identische Keyframes mit verschiedenen Namen (`hopLeft`/`hopRight`) – der Klassenwechsel startet die Animation neu.
- 2026-11-14 (v2): Autosave ohne verlorene Änderungen: Stand in einem Ref halten, Revisionszähler hochzählen, nach dem Speichern prüfen, ob sich etwas geändert hat, und ggf. nachspeichern. Statt `beforeunload` beim `visibilitychange` sofort speichern.
- 2026-11-14 (v2): Native Dialoge/Validierung (confirm, alert, required, `<select>`, `title`) passen nicht ins Design → `useDialog()`, `Select`, `Switch`, `noValidate` + eigene Meldung. Der E2E-Test wertet jeden nativen Dialog als Fehler.
- 2026-11-14 (v2): E2E-Schleifen über Screens: erst warten, dann prüfen, ob der Ende-Screen da ist – sonst greift die Prüfung vor dem Speichern und der Test läuft in einen Timeout.

- 2026-11-14: Elemente, die beim Fokus eingeblendet werden, verschieben das Layout zwischen mousedown und mouseup → Klick geht verloren. Regel: auf Fokus nur Farbe/Sichtbarkeit ändern, nie die Höhe.

- 2026-11-14: Nach dem Umbenennen von Routen meldet `tsc` Fehler aus `.next/types` → vor dem Typecheck `rm -rf .next`.
- 2026-11-14: Neue Fragearten (Stufen) ohne Migration: DB-Typ + `settings.display` (wie Sterne). Migration nur für Bogen-Felder nötig (`forms.settings`, `public_slug`).
- 2026-11-14: Zustandsänderung + Speichern im selben Klick (Live schalten) → `save(patch)` statt `patchForm()` + `save()`, sonst wird der alte Stand gespeichert.

- 2026-11-13: Admin-CSS (globale `h3`, `textarea`) griff auf die Builder-Vorschau durch → Admin-Stile nur in `.admin-main > h1` und `.panel`.
- 2026-11-13: Im Dev-Modus laufen Effekte doppelt, und eine verspätete Ladeantwort überschrieb getippte Builder-Änderungen → Lade-Effekte immer mit `cancelled`-Flag.
- 2026-11-13: Maskottchen kam als JPG mit weißem Hintergrund. Ein Flood-Fill mit zu lockerer Schwelle frisst den weißen Mützenrand → Schwelle 254 (Hintergrund ist reines Weiß) + 3-px-Randband. Besser gleich PNG aus Figma anfordern.
- 2026-11-13: Vercel-Previews hatten keine Supabase-Variablen (Integration setzt nur `SUPABASE_*` ohne `NEXT_PUBLIC_`) → `next.config.ts` reicht URL + Publishable Key durch, mit öffentlichem Fallback.
- 2026-11-13: Repo war beim Anlegen des Vercel-Projekts leer, Preset stand auf „Other“ → `vercel.json` mit `framework: nextjs`.
- 2026-11-13: Bilder/Dateien aus WhatsApp kommen beim Agenten nicht an → Ruwen lädt sie als Kommentar im PR hoch, der Agent holt sie per GitHub-API.
- 2026-11-13: Prototyp-Farben nicht schätzen, sondern per Canvas aus den PNGs auslesen (`getImageData`).
