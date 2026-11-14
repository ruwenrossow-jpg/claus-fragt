# Ready-Check: echter Einsatz

Stand 14.11.2026 (Nacht-Runde Builder v2). ✅ fertig · ⚠️ teilweise · ❌ fehlt.

## Fertig
| Bereich | Stand |
|---|---|
| ✅ Ablauf Ersteller:in | Meine Bögen, Neuer Bogen, Editor (8 Fragearten, Autosave), Vorschau (Desktop + Handy), Teilen (Live, Link, QR/PNG, Beamer, Schließen/Öffnen), Ergebnisse (Filter, CSV), Duplizieren |
| ✅ Ablauf Teilnehmende | Start → Fragen → Ende → Ergebnisse → Danke, Zurück überall, Pflicht-Hinweis, Ändern ohne zweite Abgabe |
| ✅ Kein Datenverlust durch Bedienfehler | Löschen = Papierkorb (`settings.geloescht`), Wiederherstellen + „Rückgängig“; hartes Löschen gibt es in der App nicht |
| ✅ Robuste Abgabe | feste Abgabe-id: Doppeltipp, Netzfehler + erneut versuchen, zurück + ändern erzeugen nie eine zweite Abgabe |
| ✅ Status-Screens | Entwurf („noch nicht live“), Geschlossen, Gelöscht/falscher Link („gibt es nicht mehr“), keine Verbindung (+ Nochmal), 404, Fehlerseite – alle im Claus-Raster |
| ✅ Admin-Zustände | Laden, leer, nicht gefunden, Supabase-Fehler mit „Nochmal versuchen“ |
| ✅ Barrierefreiheit (Grundlagen) | Fragen als Gruppen-Name für Screenreader, Felder mit Namen, Fokus im Dialog gefangen und zurückgegeben, Auswahllisten mit Pfeiltasten, sichtbarer Tastatur-Fokus |
| ✅ Metadaten | Seitentitel je Seite, Link-Vorschau (Open Graph) mit Bogen-Name, Favicon + Apple-Icon, `noindex` |
| ✅ Performance | Maskottchen als WebP in Anzeigegröße (≈ 25 statt 220–400 KB), Logo 20 statt 107 KB |
| ✅ Tests | `scripts/visual-test.mjs`: alle Journeys, Raster-Messung (0 px Abweichung), Testbögen markiert und sauber aufgeräumt |

## Fehlt noch
| Bereich | Was | Wer / wie |
|---|---|---|
| ❌ **Login / Rechte** | Jede Person mit dem öffentlichen Schlüssel kann heute alle Tabellen lesen und ändern (RLS offen). Freitext-Antworten sind technisch abrufbar. | Plan + SQL-Entwurf: `docs/PLAN-LOGIN.md`, `docs/login-entwurf.sql` (2–2,5 Tage, braucht Ruwens Supabase-Einstellungen) |
| ❌ **Datenschutzhinweis (DSGVO)** | Kurzer Hinweis auf dem Start-Screen + eigene Seite: wer verantwortlich ist, welche Daten (Antworten, Zeitpunkt; keine Namen/IP in der DB), Zweck, Speicherdauer, Auftragsverarbeiter (Supabase, Vercel), Rechte. | Text kommt von InnoNord; Link-Platz im Start-Screen vorsehen (`brand/copy.ts`) |
| ❌ **Impressum-Link** | Pflicht bei öffentlichem Angebot. | Link auf das InnoNord-Impressum im Start-Screen und im Admin-Fuß |
| ❌ **AV-Vertrag** | Supabase (EU-Region prüfen) und Vercel als Auftragsverarbeiter. | Ruwen / InnoNord |
| ❌ **Rate-Limit / Spam-Schutz** | Ein Skript könnte massenhaft Abgaben anlegen. | Mit Login: `submit_response`-RPC + Limit je IP (Vercel Firewall/Edge) oder Turnstile; heute nur Längenbegrenzung der Freitexte (300/2000 Zeichen) |
| ⚠️ **Backups** | Supabase Free hat keine Point-in-Time-Recovery. Heute: manuelles `_sicherung/sichern.sh` (JSON, außerhalb des Repos). | Regelmäßig (z. B. täglich per Cron auf Ruwens Rechner) oder Supabase Pro mit täglichen Backups |
| ⚠️ **Papierkorb endgültig leeren** | Gibt es bewusst nicht in der App. | Bei Bedarf manuell per SQL, nach Sicherung |
| ⚠️ **Gleichzeitig bearbeiten** | Zwei offene Editor-Tabs überschreiben sich gegenseitig (letzter gewinnt); ein offener Editor kann einen in einem anderen Tab gelöschten Bogen beim nächsten Speichern wieder sichtbar machen. | Mit Login: `updated_at`-Prüfung beim Speichern |
| ⚠️ **Tonalität** | Regeln nur als Hinweise im Editor. | Zentrale Tonalitätsregeln in `brand/copy.ts` (offen laut Builder Book) |
| ⚠️ **Monitoring** | Keine Fehlerberichte aus dem Browser. | Vercel Analytics/Logs oder Sentry |
