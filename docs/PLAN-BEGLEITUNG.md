# Plan: Framework und Tonalität als stille Begleitung im Editor

Stand 14.11.2026. **Gebaut (Ruwens Wunsch 14.11.):** „Ablauf-Idee“ unter der Kopf-Karte – 5 Schritte mit typischer Frageart, Drüberfahren/Antippen zeigt Vorschläge, Klick legt die Frage an (`questions.step`); weggescrollt sitzt sie als kleine Schiene am rechten Rand. Inhalte in `lib/ablauf.ts` (Platzhalter aus v1, bis Ruwens 5 Bereiche da sind). Test: `scripts/ablauf-test.mjs`. Ruwens Vorgabe: „intuitiv und ohne Eingriff in das Handeln – nur als simple Begleitung
in den Erstellprozess integrieren“. Dazu: „inspirierend oder lernend hat noch keinen spürbaren Impact“.

## Grundsätze
1. **Nichts blockiert.** Kein Pflichtschritt, kein Assistent, kein Pop-up. Wer den Begleiter ignoriert, baut genauso schnell wie heute.
2. **Sichtbar, wo man gerade arbeitet.** Hinweise stehen an der Frage oder ruhig am Rand, nie als Liste am Ende.
3. **Ein Klick übernimmt, nichts passiert automatisch.** Vorschläge (Beispielfrage, kürzere Formulierung) werden erst auf Klick eingesetzt.
4. **Claus spricht.** Begleittexte kommen als „Claus-Tipp“ in seinem Ton (kurz, du, freundlich), damit es nicht nach Prüfung wirkt.

## 1. Framework-Kompass (Übersicht der 5 Bereiche)
- Unter der Kopf-Karte (Name/Beschreibung/Art) eine schmale Leiste mit **5 Punkten**, einer je Bereich. Gefüllt = mindestens eine Frage
  gehört dazu. Daneben z. B. „3 von 5 Bereichen“.
- Klick auf einen Punkt: kleines Feld mit einem Satz, *warum* der Bereich zählt, und 1–2 Beispielfragen mit „+ übernehmen“.
- **Zuordnung ohne Arbeit:** Jede Frage bekommt einen Bereich vorgeschlagen (Stichwörter + Frageart); in der Frage-Karte steht dezent
  „Bereich: Transfer · ändern“. Gespeichert in `questions.step` / `settings.slotId` (gibt es schon, keine Migration).
- Ergebnisse: Kennzahlen (KPI) je Bereich oben auf der Ergebnis-Seite, nur wenn passende Fragen da sind (`lib/kpi.ts` gibt es schon).

## 2. Tonalität als Claus-Tipp
- Heute: gelbe Warnliste unter der Frage (`lib/rules.ts`). Neu: **ein** Tipp auf einmal, als kleine Claus-Zeile unter dem Fragetext,
  z. B. „Klingt nach Amt – wie wär's mit: *Was nimmst du mit?*“ + „Übernehmen“. Verschwindet, sobald die Frage passt.
- Ein kleines Symbol je Frage-Karte (grün = passt, gelb = Tipp da) statt Textblöcken. Die Regeln selbst bleiben zentral in
  `brand/copy.ts`/`lib/rules.ts` (du statt Sie, kurz, Auftrag statt Frage, keine Zukunft, eine Sache pro Frage …).
- Optional „Übersicht Tonalität“ als aufklappbare Karte am Ende: die 10 Regeln mit je einem Vorher/Nachher-Beispiel (zum Nachlesen, nicht zum Abhaken).

## 3. Inspirierend vs. Lernend spürbar machen
Heute ändert die Art nur Emojis. Vorschlag – sichtbar sowohl im Editor als auch für Teilnehmende:
| | Inspirierend | Lernend |
|---|---|---|
| Kompass-Schwerpunkt | Begeisterung, Wiederkommen, Weitererzählen | Verstanden, Anwenden (Transfer), Ziel erreicht |
| Beispielfragen im Kompass | „Was hat dich überrascht?“ | „Was setzt du nächste Woche um?“ |
| Tafel (Menti) | Wortwolke als Einstieg vorgeschlagen | Abstimmung/Balken vorgeschlagen |
| Look für Teilnehmende | Emojis, Claus froh, verspielte Texte | ohne Emojis, sachlichere Texte, ruhigeres Claus-Motiv |
| Ergebnis-Seite | KPI „Begeisterung“ zuerst | KPI „Transfer“ zuerst |
Im Editor steht unter der Art-Wahl eine Zeile „Das ändert sich: …“, damit die Wirkung sofort spürbar ist.

## Was ich von Ruwen brauche
1. Die **5 Bereiche** final: je Name, ein Satz „warum“, 1–2 Beispielfragen, die Kennzahl (KPI).
2. Die **Tonalitätsregeln** final (Liste + je ein Vorher/Nachher-Beispiel).
3. Ob für „Lernend“ ein zweites Claus-Motiv kommt (PNG aus Figma).

## Reihenfolge (je etwa eine Bau-Runde)
1. Kompass-Leiste + Bereich je Frage (braucht Punkt 1).
2. Claus-Tipps statt Warnliste (braucht Punkt 2, sonst mit den heutigen Regeln).
3. Art spürbar machen (Texte, Vorschläge, KPI-Reihenfolge, ggf. Motiv).
