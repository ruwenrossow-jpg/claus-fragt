# Learnings

Neue Einträge oben. Format: Datum – Problem → Lösung/Regel.

- 2026-11-13: Admin-CSS (globale `h3`, `textarea`) griff auf die Builder-Vorschau durch → Admin-Stile nur in `.admin-main > h1` und `.panel`.
- 2026-11-13: Im Dev-Modus laufen Effekte doppelt, und eine verspätete Ladeantwort überschrieb getippte Builder-Änderungen → Lade-Effekte immer mit `cancelled`-Flag.
- 2026-11-13: Maskottchen kam als JPG mit weißem Hintergrund. Ein Flood-Fill mit zu lockerer Schwelle frisst den weißen Mützenrand → Schwelle 254 (Hintergrund ist reines Weiß) + 3-px-Randband. Besser gleich PNG aus Figma anfordern.
- 2026-11-13: Vercel-Previews hatten keine Supabase-Variablen (Integration setzt nur `SUPABASE_*` ohne `NEXT_PUBLIC_`) → `next.config.ts` reicht URL + Publishable Key durch, mit öffentlichem Fallback.
- 2026-11-13: Repo war beim Anlegen des Vercel-Projekts leer, Preset stand auf „Other“ → `vercel.json` mit `framework: nextjs`.
- 2026-11-13: Bilder/Dateien aus WhatsApp kommen beim Agenten nicht an → Ruwen lädt sie als Kommentar im PR hoch, der Agent holt sie per GitHub-API.
- 2026-11-13: Prototyp-Farben nicht schätzen, sondern per Canvas aus den PNGs auslesen (`getImageData`).
