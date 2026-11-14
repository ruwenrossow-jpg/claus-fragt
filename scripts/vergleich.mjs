// Setzt Prototyp (docs/prototyp, links) und Screenshot aus .shots/ (rechts) nebeneinander → .shots/vergleich-<prototyp>.png
// Aufruf: node scripts/vergleich.mjs start=11-start multiple-choice=11-frage-1 stars=11-frage-2 over=11-ende results=11-ergebnis-1
// (ohne „=“ heißt der Screenshot wie der Prototyp)
import { chromium } from "playwright-core";
import fs from "fs";
const pairs = process.argv.slice(2).map((a) => a.split("="));
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 800, height: 860 } });
for (const [proto, shot = proto] of pairs) {
  const a = fs.readFileSync(`docs/prototyp/${proto}.png`).toString("base64");
  const c = fs.readFileSync(`.shots/${shot}.png`).toString("base64");
  await p.setContent(`<body style="margin:0;display:flex;gap:6px;background:#333"><img src="data:image/png;base64,${a}" width=393><img src="data:image/png;base64,${c}" width=393 height=852 style="object-fit:cover;object-position:top"></body>`);
  await p.screenshot({ path: `.shots/vergleich-${proto}.png`, clip: { x: 0, y: 0, width: 792, height: 852 } });
}
await b.close();
