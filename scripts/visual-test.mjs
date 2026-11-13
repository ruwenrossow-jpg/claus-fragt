// End-to-End-Test des ganzen Ablaufs mit Screenshots nach .shots/:
// Neuer Bogen (Event-Kachel) → Editor (Plätze) → Teilen (Live schalten, QR) → Ausfüllen am Handy (Auto-Weiter) → Ergebnis → Ergebnisseite.
// Der Testbogen wird am Ende gelöscht (außer mit --keep).
// Aufruf: node scripts/visual-test.mjs [BASE_URL] [--keep]   (braucht installiertes Google Chrome)
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3000";
const OUT = ".shots/";
const NAME = `E2E Hackathon ${Date.now().toString(36)}`;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("dialog", (d) => d.accept());
};

// ---------- Ersteller:in (Desktop) ----------
const admin = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
watch(admin);
await admin.goto(`${BASE}/neu`);
await admin.waitForSelector("text=Hackathon / Studierende");
await admin.screenshot({ path: OUT + "1-neu.png" });
await admin.click("text=Hackathon / Studierende");
await admin.fill("#event", NAME);
await admin.fill("#thema", "Wasserstoff");
await admin.click("button:has-text('Los')");
await admin.waitForURL(/\/bearbeiten/);
await admin.waitForSelector("text=Zielgruppe");

// Plätze ausfüllen: Beispiel übernehmen + Optionen für Highlight/Verbesserung
const links = admin.locator("button:has-text('Beispiel übernehmen')");
for (let i = (await links.count()) - 1; i >= 0; i--) await links.nth(i).click();
const card = (name) => admin.locator("section.panel", { has: admin.locator(`span:text-is("${name}")`) });
for (const [slot, opts] of [["Highlight", ["Pitches", "Coding", "Essen"]], ["Verbesserung", ["Mehr Zeit", "Mehr Mentoring", "Bessere Räume"]]]) {
  for (let i = 0; i < opts.length; i++) {
    const inputs = card(slot).locator('input[placeholder^="Antwort"]');
    if ((await inputs.count()) <= i) await card(slot).locator("button:has-text('+ Antwort')").click();
    await inputs.nth(i).fill(opts[i]);
  }
}
await admin.screenshot({ path: OUT + "2-editor.png" });
await admin.click("button:has-text('Speichern')");
await admin.waitForSelector("text=Gespeichert ✓");

await admin.click("header button:has-text('Teilen')");
await admin.waitForSelector("text=Live schalten");
await admin.screenshot({ path: OUT + "3-teilen-entwurf.png" });
await admin.click("button:has-text('Live schalten')");
await admin.waitForSelector("text=PNG herunterladen");
await admin.waitForTimeout(500);
await admin.screenshot({ path: OUT + "4-teilen-live.png" });
const link = await admin.locator('[role=dialog] input[readonly]').inputValue();
const formId = admin.url().split("/b/")[1].split("/")[0];

// ---------- Teilnehmende:r (Handy) ----------
const phone = await (await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })).newPage();
watch(phone);
await phone.goto(link);
await phone.waitForSelector("text=Los geht's");
await phone.waitForTimeout(500);
await phone.screenshot({ path: OUT + "5-start.png" });
await phone.click("text=Los geht's");

let shot = 0;
for (let guard = 0; guard < 20; guard++) {
  await phone.waitForTimeout(350);
  if (await phone.locator("text=Ergebnis ansehen").count()) break;
  shot++;
  if (shot <= 3 || shot % 3 === 0) await phone.screenshot({ path: OUT + `6-frage-${shot}.png` });
  if (await phone.locator("textarea").count()) {
    await phone.fill("textarea", "Super Orga!");
    await phone.click("text=WEITER!");
  } else if (await phone.locator("input[type=text]").count()) {
    await phone.locator("input[type=text]").first().fill("Elektrolyse");
    await phone.click("text=WEITER!");
  } else if (await phone.locator("button[role=checkbox]").count()) {
    await phone.locator("button[role=checkbox]").nth(0).click();
    await phone.locator("button[role=checkbox]").nth(1).click();
    await phone.click("text=WEITER!");
  } else {
    // Auto-Weiter: Option wählen und warten
    const radios = phone.locator("button[role=radio]");
    await radios.nth(Math.min(2, (await radios.count()) - 1)).click();
    await phone.waitForTimeout(600);
  }
}
await phone.waitForSelector("text=Ergebnis ansehen");
await phone.screenshot({ path: OUT + "7-ende.png" });
await phone.click("text=Ergebnis ansehen");
await phone.waitForSelector("text=So haben die anderen geantwortet");
await phone.waitForTimeout(600);
await phone.screenshot({ path: OUT + "8-ergebnis.png" });
for (let i = 0; i < 15 && !(await phone.locator("text=Wir lesen jede Antwort").count()); i++) {
  await phone.locator("button:has-text('WEITER!'), button:has-text('Fertig')").first().click();
  await phone.waitForTimeout(250);
}
await phone.screenshot({ path: OUT + "9-danke.png" });

// ---------- Ergebnisseite ----------
await admin.goto(`${BASE}/b/${formId}/ergebnisse`);
await admin.waitForSelector("text=Transfer-Score");
await admin.waitForTimeout(500);
await admin.screenshot({ path: OUT + "10-ergebnisse.png" });
const kpis = (await admin.locator(".kpi").allInnerTexts()).map((t) => t.replace(/\s+/g, " "));

if (!process.argv.includes("--keep")) {
  await admin.goto(`${BASE}/meine-boegen`);
  await admin.locator(".panel", { hasText: NAME }).locator("button:has-text('Löschen')").click();
  await admin.waitForTimeout(1200);
}
console.log(JSON.stringify({ link, kpis, errors: errors.length ? errors : "none" }, null, 1));
await browser.close();
