# Tafel (Menti-Modus): Ablauf für Ersteller:innen

Beispiel Hackathon-Abschluss: 4 Fragen gemeinsam an der Tafel, danach geht jede:r allein weiter.

1. **Bogen bauen:** Bei den gemeinsamen Fragen „An der Tafel“ einschalten (Freitext → Wortwolke oder Karten, Auswahl/Sterne/Skala → Balken).
   Neue Fragen sind standardmäßig Pflicht. Bogen live schalten.
2. **Tafel starten:** Im Editor oben „Tafel“ (oder im Teilen-Fenster „Tafel starten“) → die **Steuerung** öffnet sich (Laptop oder Handy).
   Dort „Beamer öffnen“ → das Beamer-Fenster auf den Beamer ziehen, Vollbild (Mac: Ctrl+Cmd+F, Windows: F11).
   Nur ein Bildschirm? Dann direkt den Beamer zeigen und unten steuern (die Knöpfe blenden aus, wenn die Maus ruht).
   **Ohne Beamer** hält die Steuerung selbst den Stand („Kein Beamer offen“): die Handys folgen trotzdem gemeinsam, niemand klickt sich allein durch.
   Öffnest du danach den Beamer, übernimmt er den Stand. Ein zweites Beamer-Fenster (z. B. am Handy) spiegelt nur und steuert den ersten mit.
3. **Lobby:** Der Beamer zeigt den QR-Code und „X Handys dabei“. Wer scannt und „Los geht's“ tippt, wartet mit „Schau nach vorne“.
   Sind alle drin: „Alle drin – los geht's“.
4. **Gemeinsame Fragen:** Alle Handys zeigen gleichzeitig dieselbe Frage. In der Steuerung siehst du die Antworten sofort (der Beamer zeigt nur den Zähler),
   mit „Zeigen“ erscheinen sie am Beamer. Freitext: „Als Karten“ / „Als Wolke“ umschalten. Wer abgeschickt hat, sieht „Angekommen“ und kann ändern.
   **Mehrere Begriffe** (Text kurz): mit Komma trennen oder nach dem Abschicken „Noch ein Wort“ – die Wolke zählt jeden Begriff einzeln
   (gespeichert bleibt eine Antwort je Person, z. B. „Teamgeist, Pizza“). Die nächste Frage kommt erst, wenn die Moderation weiterklickt.
   Noch keine Antworten? Der Beamer zeigt dann QR-Code + Link („Noch keine Antworten“) statt einer leeren Fläche.
   Wer den Bogen schon allein angefangen hat, wird beim Start der Tafel in den gemeinsamen Teil geholt (Antworten bleiben).
   Nachzügler steigen bei der aktuellen Frage ein; verpasste Pflichtfragen bekommen sie danach allein.
5. **Übergang:** „Gemeinsamen Teil beenden“ → Handys zeigen „Das war der gemeinsame Teil“ + WEITER! → die übrigen Fragen allein → Ergebnis → Danke.
6. Tasten / Presenter-Klicker: → weiter, ← zurück, Z zeigen, K Karten/Wolke (am Beamer). „Zurück“ zeigt die vorige Frage gleich mit Ergebnis.
   „Neu starten“ beginnt eine neue Runde (nur Antworten ab dann zählen). Beim allerersten Öffnen zählen Abgaben der letzten 30 s mit –
   wer den Bogen **vorher** allein ausgefüllt hat, taucht an der Tafel nicht auf (so war es bei Ruwens erstem Test: „Zeigen“ blieb leer).

Technik: `lib/tafel.ts` (genau ein Host: Beamer vor Steuerung, sonst der ältere; alle anderen spiegeln + schicken Befehle; Handys hören nur zu), Seiten `/b/<id>/tafel` und `/b/<id>/tafel/steuerung`, Test `scripts/tafel-test.mjs`.
