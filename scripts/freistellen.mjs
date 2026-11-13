// Entfernt den weißen Hintergrund eines JPG per Flood-Fill vom Rand aus (Innenflächen wie Zähne/Mützenrand bleiben).
// Aufruf: node scripts/freistellen.mjs eingabe.jpg ausgabe.png vorschau.png   (braucht installiertes Google Chrome)
import { chromium } from "playwright-core";
import fs from "fs";
const [, , input, output, preview] = process.argv;
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage();
const src = "data:image/jpeg;base64," + fs.readFileSync(input).toString("base64");
const res = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  const near = (i, t) => d[i] >= t && d[i + 1] >= t && d[i + 2] >= t && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < (t >= 254 ? 3 : 48);
  const bg = new Uint8Array(W * H), st = [];
  for (let i = 0; i < W; i++) st.push(i, (H - 1) * W + i);
  for (let j = 0; j < H; j++) st.push(j * W, j * W + W - 1);
  while (st.length) {
    const k = st.pop(); if (bg[k]) continue;
    if (!near(k * 4, 254)) continue;
    bg[k] = 1; const px = k % W, py = (k / W) | 0;
    if (px > 0) st.push(k - 1); if (px < W - 1) st.push(k + 1); if (py > 0) st.push(k - W); if (py < H - 1) st.push(k + W);
  }
  // JPEG-Rauschen am Rand: helle, ungesättigte Pixel direkt neben dem Hintergrund mit entfernen
  for (let it = 0; it < (W < 800 ? 3 : 2); it++) {
    const add = [];
    for (let k = 0; k < W * H; k++) {
      if (bg[k] || !near(k * 4, W < 800 ? 200 : 228)) continue;
      const px = k % W, py = (k / W) | 0;
      if ((px > 0 && bg[k - 1]) || (px < W - 1 && bg[k + 1]) || (py > 0 && bg[k - W]) || (py < H - 1 && bg[k + W])) add.push(k);
    }
    for (const k of add) bg[k] = 1;
  }
  // Randband (3 px) um den Hintergrund: helle Pixel dort sind JPEG-Reste → transparent
  let band = bg.slice();
  for (let it = 0; it < 3; it++) {
    const nb = band.slice();
    for (let k = 0; k < W * H; k++) {
      if (band[k]) continue;
      const px = k % W, py = (k / W) | 0;
      if ((px > 0 && band[k - 1]) || (px < W - 1 && band[k + 1]) || (py > 0 && band[k - W]) || (py < H - 1 && band[k + W])) nb[k] = 1;
    }
    band = nb;
  }
  for (let k = 0; k < W * H; k++) {
    if (!bg[k] && band[k] && (d[k * 4] + d[k * 4 + 1] + d[k * 4 + 2]) / 3 > 195) bg[k] = 1;
  }
  for (let k = 0; k < W * H; k++) {
    if (bg[k]) { d[k * 4 + 3] = 0; continue; }
    // weiche Kante: helle Randpixel neben Hintergrund teiltransparent
    const px = k % W, py = (k / W) | 0;
    const nb = (px > 0 && bg[k - 1]) || (px < W - 1 && bg[k + 1]) || (py > 0 && bg[k - W]) || (py < H - 1 && bg[k + W]);
    if (nb) { const l = (d[k * 4] + d[k * 4 + 1] + d[k * 4 + 2]) / 3; if (l > 200) d[k * 4 + 3] = Math.max(0, Math.min(255, (255 - l) * 4.5)); }
  }
  x.putImageData(id, 0, 0);
  const out = c.toDataURL("image/png");
  const v = document.createElement("canvas"); v.width = W; v.height = H;
  const y = v.getContext("2d"); y.fillStyle = "#bffaff"; y.fillRect(0, 0, W, H); y.drawImage(c, 0, 0);
  return [out, v.toDataURL("image/png")];
}, src);
fs.writeFileSync(output, Buffer.from(res[0].split(",")[1], "base64"));
fs.writeFileSync(preview, Buffer.from(res[1].split(",")[1], "base64"));
await b.close();
