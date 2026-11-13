// Visueller End-to-End-Test: legt einen Bogen wie im Prototyp an, füllt ihn aus,
// macht Screenshots jedes Screens (393 × 852) nach .shots/ und löscht den Bogen wieder.
// Aufruf: node scripts/visual-test.mjs [BASE_URL] [--keep]   (braucht installiertes Google Chrome)
import fs from "fs";
import { chromium } from "playwright-core";
const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3000";
const OUT = ".shots/";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("dialog", (d) => d.accept());

await page.goto(BASE);
await page.click("text=+ Neuer Bogen");
await page.waitForURL(/\/edit$/);
const id = page.url().split("/forms/")[1].split("/")[0];
await page.waitForSelector("text=Frage hinzufügen");
await page.fill("input[type=text] >> nth=0", "Visueller Test (Claude)");
for (const label of ["Multiple Choice (eine Antwort)", "Skala (Zahlen)", "Sterne-Bewertung", "Offene Antwort"]) {
  await page.click(`button:has-text("+ ${label}")`);
}
const qInputs = page.locator('input[placeholder="Hier könnte Ihre Frage stehen"]');
for (let i = 0; i < 4; i++) await qInputs.nth(i).fill("Hier könnte Ihre Frage stehen");
await page.screenshot({ path: OUT + "builder.png", fullPage: false });
await page.click("button:has-text('Speichern')");
await page.waitForSelector("text=Gespeichert ✓");

const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const p = await m.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${BASE}/f/${id}`);
await p.waitForSelector("text=START!");
await p.waitForTimeout(600);
await p.screenshot({ path: OUT + "start.png" });
await p.click("text=START!");
await p.click("text=Antwort B");
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + "multiple-choice.png" });
await p.click("text=WEITER!");
await p.click("button[role=radio]:has-text('4')");
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + "scale.png" });
await p.click("text=WEITER!");
await p.click("button[aria-label='3 Sterne']");
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + "stars.png" });
await p.click("text=WEITER!");
await p.fill("textarea", "Mehr Pausen");
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + "open-answer.png" });
await p.click("text=WEITER!");
await p.waitForSelector("text=ERGEBNIS!");
await p.waitForTimeout(400);
await p.screenshot({ path: OUT + "over.png" });
await p.click("text=ERGEBNIS!");
await p.waitForSelector("text=Frage 1");
await p.waitForTimeout(700);
await p.screenshot({ path: OUT + "results.png" });
await p.click("text=WEITER!"); await p.click("text=WEITER!");
await p.click("text=BEENDEN!");
await p.waitForTimeout(400);
await p.screenshot({ path: OUT + "done.png" });

if (!process.argv.includes("--keep")) {
  await page.goto(BASE);
  await page.locator(".panel", { hasText: "Visueller Test (Claude)" }).locator("button:has-text('Löschen')").click();
  await page.waitForTimeout(1200);
}
console.log("form", id, "errors:", errors.length ? errors : "none");
await b.close();
