// Setzt Prototyp (docs/prototyp, links) und Screenshot aus .shots/ (rechts) nebeneinander → .shots/vergleich-<name>.png
// Aufruf: node scripts/vergleich.mjs start multiple-choice scale stars open-answer over results
import { chromium } from "playwright-core";
import fs from "fs";
const names = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 800, height: 860 } });
for (const n of names) {
  const a = fs.readFileSync(`docs/prototyp/${n}.png`).toString("base64");
  const c = fs.readFileSync(`.shots/${n}.png`).toString("base64");
  await p.setContent(`<body style="margin:0;display:flex;gap:6px;background:#333"><img src="data:image/png;base64,${a}" width=393><img src="data:image/png;base64,${c}" width=393></body>`);
  await p.screenshot({ path: `.shots/vergleich-${n}.png`, clip: { x: 0, y: 0, width: 792, height: 852 } });
}
await b.close();
