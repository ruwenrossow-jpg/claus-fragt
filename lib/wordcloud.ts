/** Wortwolke: Freitext-Antworten → Begriffe mit Häufigkeit (wie bei Menti). Kurze Antworten zählen als Ganzes. */

const STOP = new Set(
  "der die das den dem des ein eine einer eines einem einen und oder aber auch als am an auf aus bei bin bis da dann dass du er es für hat habe hatte hier ich ihr im in ist ja mal man mehr mir mit nach nicht noch nur ob sehr sich sie so sind über um uns von vor war waren was wie wir wird zu zum zur viel viele ganz gut echt etwas the and".split(" ")
);

export interface CloudWord {
  text: string;
  count: number;
}

/** Komma/Semikolon/Zeile trennt Begriffe. Bis zu 3 Wörter = ein Begriff („Teamarbeit“, „coole Leute“); längere Antworten werden in Wörter zerlegt (ohne Füllwörter). */
export function cloudWords(answers: string[], limit = 60): CloudWord[] {
  const counts = new Map<string, CloudWord>();
  const add = (raw: string) => {
    const text = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
    if (!text) return;
    const key = text.toLocaleLowerCase("de");
    const hit = counts.get(key);
    if (hit) {
      hit.count++;
      // Schreibweise: großgeschrieben gewinnt („Teamgeist“ statt „teamgeist“)
      if (text[0] !== text[0].toLocaleLowerCase("de") && hit.text[0] === hit.text[0].toLocaleLowerCase("de")) hit.text = text;
    }
    else counts.set(key, { text, count: 1 });
  };
  // Mehrere Begriffe einer Person („Teamgeist, Pizza“ – Tafel: „Noch ein Wort“) zählen einzeln
  const parts = answers.flatMap((a) => a.split(/[,;\n]+/));
  for (const a of parts) {
    const words = a.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    if (words.length <= 3 && a.length <= 40) add(words.join(" "));
    else words.filter((w) => w.length > 2 && !STOP.has(w.toLocaleLowerCase("de").replace(/[^\p{L}]/gu, ""))).forEach(add);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "de")).slice(0, limit);
}

/** Reihenfolge für die Darstellung: die häufigsten in die Mitte, die selteneren abwechselnd nach außen. */
export function middleOut<T>(sorted: T[]): T[] {
  const out: T[] = [];
  sorted.forEach((w, i) => (i % 2 ? out.push(w) : out.unshift(w)));
  return out;
}
