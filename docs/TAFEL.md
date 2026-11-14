# Tafel (Menti-Modus): Ablauf für Ersteller:innen

Beispiel Hackathon-Abschluss: 4 Fragen gemeinsam an der Tafel, danach geht jede:r allein weiter.

1. **Bogen bauen:** Bei den gemeinsamen Fragen „An der Tafel“ einschalten (Freitext → Wortwolke oder Karten, Auswahl/Sterne/Skala → Balken).
   Neue Fragen sind standardmäßig Pflicht. Bogen live schalten.
2. **Tafel starten:** Im Editor oben „Tafel“ (oder im Teilen-Fenster „Tafel starten“) → die **Steuerung** öffnet sich (Laptop oder Handy).
   Dort „Beamer öffnen“ → das Beamer-Fenster auf den Beamer ziehen, Vollbild (Mac: Ctrl+Cmd+F, Windows: F11).
   Nur ein Bildschirm? Dann direkt den Beamer zeigen und unten steuern (die Knöpfe blenden aus, wenn die Maus ruht).
3. **Lobby:** Der Beamer zeigt den QR-Code und „X Handys dabei“. Wer scannt und „Los geht's“ tippt, wartet mit „Schau nach vorne“.
   Sind alle drin: „Alle drin – los geht's“.
4. **Gemeinsame Fragen:** Alle Handys zeigen gleichzeitig dieselbe Frage. In der Steuerung siehst du die Antworten sofort (der Beamer zeigt nur den Zähler),
   mit „Zeigen“ erscheinen sie am Beamer. Freitext: „Als Karten“ / „Als Wolke“ umschalten. Wer abgeschickt hat, sieht „Angekommen“ und kann ändern.
   Nachzügler steigen bei der aktuellen Frage ein; verpasste Pflichtfragen bekommen sie danach allein.
5. **Übergang:** „Gemeinsamen Teil beenden“ → Handys zeigen „Das war der gemeinsame Teil“ + WEITER! → die übrigen Fragen allein → Ergebnis → Danke.
6. Tasten / Presenter-Klicker: → weiter, ← zurück, Z zeigen, K Karten/Wolke (am Beamer). „Neu starten“ beginnt eine neue Runde
   (nur Antworten ab dem Start zählen).

Technik: `lib/tafel.ts` (Beamer = Host, Steuerung = Fernbedienung, Handys), Seiten `/b/<id>/tafel` und `/b/<id>/tafel/steuerung`, Test `scripts/tafel-test.mjs`.
