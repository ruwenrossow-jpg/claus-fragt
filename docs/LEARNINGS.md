# Learnings

Neue Einträge oben. Format: Datum – Problem → Lösung/Regel.

- 2026-11-14 (iPhone): iOS-Tastatur verkleinert nur den sichtbaren Bereich (`visualViewport`), nicht `100dvh` → Feld lag unter der Tastatur. `useKeyboard` erkennt Fokus im Textfeld + geschrumpften visualViewport und legt den Screen `position: fixed` genau über die Tastatur (kompakte Bühne: kleiner Claus + Frage). Test: Feld fokussieren und Viewport-Höhe verkleinern.
- 2026-11-14 (iPhone): Zu lange Antwort-Box wurde vom Verlauf am Zonenrand mittendurch abgeschnitten (Rahmen weg) → Inhaltszone als Flex-Spalte, die Box schrumpft und scrollt IN sich (`[data-scroll]`), Verlauf oben/unten nur innerhalb der Box. Ergebnis-Zeilen auf kleinen Screens kompakter.

- 2026-11-14 (Tafel): Live-Abgleich ohne Migration: Supabase Realtime Broadcast + Presence funktioniert mit dem Publishable Key ohne Tabelle. Spät Hinzukommende bekommen den Stand über einen Herzschlag (alle 2 s) plus „hello“ → sofortige Antwort; Abbruch der Moderation erkennt das Handy am ausbleibenden Herzschlag.
- 2026-11-14 (Tafel): Den Tafel-Stand NICHT in `forms.settings` legen – der offene Editor schreibt `settings` komplett und würde ihn überschreiben.
- 2026-11-14 (Tafel): Wortwolke zählt nur Abgaben ab Tafel-Start (Filter auf `responses.created_at` per `!inner`-Join), sonst erscheinen Antworten früherer Events.
- 2026-11-14: Kopfzeile am 320-px-Handy lief über → `scrollWidth` der `.admin-header` im Test messen; sehr schmale Screens blenden „Ergebnisse“ aus (`hide-xs`).

- 2026-11-14 (Nacht-Runde, Datenschutz): Bögen waren verschwunden, weil „Löschen“ hart löschte und Tests mit breiten Filtern hätten aufräumen können → Soft-Delete (`settings.geloescht`) + Papierkorb, Testbögen nur mit `settings.test`, hartes Löschen nur per REST mit Test-Filter UND exakter id; Sicherung vor jedem Testlauf und Vergleich am Ende.
- 2026-11-14 (Nacht-Runde): Fehler beim Speichern einer Abgabe erzeugte beim „nochmal“ eine zweite, leere Abgabe (neue id) → id einmal pro Seite erzeugen, Abgabe per Upsert (`ignoreDuplicates`), Antworten ersetzen. Regel: Schreibvorgänge, die der Nutzer wiederholen kann, müssen idempotent sein.
- 2026-11-14 (Nacht-Runde): Doppeltipp auf WEITER! übersprang die nächste Frage (zweiter Klick traf den neuen Screen) → 400 ms nach jedem Screen-Wechsel Klicks am Haupt-Button ignorieren; laufendes Speichern per Ref sperren (State ist zu spät).
- 2026-11-14 (Nacht-Runde): `.single()` bei unbekanntem Slug liefert HTTP 406 (Konsolenfehler), kaputte ids HTTP 400 → `.maybeSingle()` + id-Prüfung vor der Abfrage, eigener `DataError` mit `kind` für passende Screens.
- 2026-11-14 (Nacht-Runde): Skala 0–10 lief am Handy rechts aus der Box, sehr lange Fragen sprengten die Sprechblase → bei ≥ 8 Stufen zwei Reihen, zwei zusätzliche Schriftstufen + Editor-Warnung ab 110 Zeichen. Randfälle (lange Texte, viele Optionen) gehören in den E2E-Test.
- 2026-11-14 (Nacht-Runde): Beamer-Seite: langer Titel brach das Flex-Layout um, der QR-Code lag unter dem sichtbaren Bereich → Grid mit QR-Breite `min(520px, 76vh, 44vw)`.
- 2026-11-14 (Nacht-Runde): `openGraph` in einem Layout ersetzt die Bilder des Eltern-Segments komplett (flaches Mergen) → Bild explizit in jedem `openGraph` setzen (`BRAND_ASSETS.og`).
- 2026-11-14 (Nacht-Runde): Next 16: `error.tsx` bekommt `retry` (nicht `reset`); Client-Seiten mit `useSearchParams` brauchen `<Suspense>`; Metadaten für Client-Seiten über ein `layout.tsx` mit `generateMetadata` (params ist ein Promise).
- 2026-11-14 (Nacht-Runde): Playwright `:text-is()` trifft Optionen mit verschachteltem `<span>` nicht → `locator(sel, { hasText: /^…$/ })` oder Tastatur. Am Handy ist „Gespeichert“ nur ein Icon → Tests warten auf `[data-save=saved]`.

- 2026-11-14 (Raster): Button und Blase sprangen je nach Inhalt → ein `<Screen>` mit festen Grid-Zonen (Kopf · Bühne · Inhalt `1fr` scrollt · Fuß), Hinweiszeile und Button-Platz immer reserviert. Prüfen per Playwright-`boundingBox` über alle Screens und mehrere Viewports (Abweichung ≤ 1 px), nicht nach Augenmaß.
- 2026-11-14 (Raster): Kleine Viewports per `@container screen (max-height: …)` statt Media Query → greift auch im verkleinerten Handy-Rahmen der Vorschau.
- 2026-11-14: Upsert gemischter Zeilen (geladene Fragen mit `created_at`, neue ohne) setzte `created_at = null` → 400. Regel: `upsert(rows, { defaultToNull: false })`.
- 2026-11-14: „Speichern & abschließen“ während eines laufenden Autosaves kehrte sofort zurück → `saveNow()` wartet, bis Revision = gespeicherte Revision.

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
