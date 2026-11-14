// Bilder für das Web vorbereiten (braucht installiertes Google Chrome):
//  - Maskottchen auf Anzeigegröße (440 px, reicht für 116 px @3x und den Beamer) als WebP (die PNGs bleiben als Quelle)
//  - Logo auf 360 px Breite (Anzeige 40 px hoch) als JPG
//  - app/apple-icon.png (180 px) und public/brand/og.png (1200 × 630, Link-Vorschau, eingebunden in brand/themes.ts → OG_IMAGE)
// Aufruf: node scripts/bilder.mjs   (überschreibt die Dateien; Quellen liegen in git)
import fs from "fs";
import { chromium } from "playwright-core";

const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage();
const data = (f, type) => `data:${type};base64,` + fs.readFileSync(f).toString("base64");

async function resize(src, type, width, outs) {
  const res = await p.evaluate(
    async ({ src, width, outs }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const h = Math.round((img.height * width) / img.width);
      const c = document.createElement("canvas");
      c.width = width;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(img, 0, 0, width, h);
      return outs.map(([mime, q]) => c.toDataURL(mime, q));
    },
    { src: data(src, type), width, outs: outs.map((o) => [o.mime, o.q]) }
  );
  res.forEach((url, i) => fs.writeFileSync(outs[i].file, Buffer.from(url.split(",")[1], "base64")));
  outs.forEach((o) => console.log(o.file, fs.statSync(o.file).size));
}

for (const name of ["claus-froh", "claus-traurig"]) {
  const src = `public/brand/${name}.png`;
  await resize(src, "image/png", 440, [{ file: `public/brand/${name}.webp`, mime: "image/webp", q: 0.9 }]);
}
// Logo nur verkleinern, wenn es noch groß ist (Quelle 1253 px liegt in git)
if ((await p.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i.width; }, data("public/brand/innonord-logo.jpg", "image/jpeg"))) > 360)
  await resize("public/brand/innonord-logo.jpg", "image/jpeg", 360, [{ file: "public/brand/innonord-logo.jpg", mime: "image/jpeg", q: 0.9 }]);

// Apple-Icon: Claus auf Bogen-Türkis
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(`<body style="margin:0;width:180px;height:180px;background:#bffaff;display:grid;place-items:center"><img src="${data("public/brand/claus-froh.png", "image/png")}" width="160" height="160"></body>`);
await p.screenshot({ path: "app/apple-icon.png" });

// Link-Vorschau (Open Graph) im Bogen-Look
await p.setViewportSize({ width: 1200, height: 630 });
await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:#bffaff;font-family:'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif;display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box">
  <img src="${data("public/brand/claus-froh.png", "image/png")}" width="340" height="340">
  <div>
    <div style="display:inline-block;padding:22px 40px;border:2px solid #000;border-radius:50%;background:#dcdcdc;font-size:38px">Hi, ich bin Claus!</div>
    <h1 style="margin:28px 0 8px;font-size:84px;line-height:1;color:#272a87">Claus fragt</h1>
    <p style="margin:0;font-size:34px">Ein paar kurze Fragen – anonym,<br>mit Ergebnis gleich danach.</p>
  </div></body>`);
await p.screenshot({ path: "public/brand/og.png" });
await b.close();
