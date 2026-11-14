// Editor am Handy: Aufklappen öffnet keine Tastatur, Zuklappen per Griff/Pfeil, Tippen mit Tastatur (simuliert: kleinerer Viewport)
// reißt die Seite nicht nach oben, schwebende Knöpfe weg beim Tippen. DATENSCHUTZ: eigener Testbogen (/neu?test=1), Aufräumen per exakter id.
// Aufruf: node scripts/editor-handy-test.mjs [BASE_URL]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3123";
const OUT = ".shots/";
fs.mkdirSync(OUT, { recursive: true });
const SB = "https://zsoiiwtcynjwkhdcbkih.supabase.co/rest/v1";
const KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const errors = [];
const check = (n, ok, d = "") => !ok && errors.push(`${n} ${d}`);
const browser = await chromium.launch({ channel: "chrome" });
let formId;
try {
  // Bogen mit 8 Fragen am Laptop anlegen
  const a = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await a.context().addInitScript(() => localStorage.setItem("claus-e2e", "1"));
  await a.goto(`${BASE}/neu?test=1`);
  await a.fill("#name", `E2E Editor Handy ${Date.now().toString(36)}`);
  await a.click("button:has-text('Bogen anlegen')");
  await a.waitForURL(/bearbeiten/);
  formId = a.url().split("/b/")[1].split("/")[0];
  for (let i = 1; i <= 8; i++) {
    await a.click("button[aria-label='Frage hinzufügen']");
    await a.locator("section[aria-label^='Frage '] textarea[aria-label=Fragetext]").fill(`Frage Nummer ${i}?`);
    await a.locator("section[aria-label^='Frage '] button[aria-label=Frageart]").click();
    await a.locator('section[aria-label^="Frage "] [role=option]:has-text("Text (kurz)")').first().click();
  }
  // Zuklappen am Laptop: Griff oben
  await a.click("section[aria-label^='Frage '] [data-collapse]");
  check("zuklappenLaptop", (await a.locator("section[aria-label^='Frage ']").count()) === 0);
  await a.waitForTimeout(2000);

  const c = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await c.addInitScript(() => localStorage.setItem("claus-e2e", "1"));
  const m = await c.newPage();
  m.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  m.on("dialog", (d) => { errors.push("Nativer Dialog"); d.dismiss(); });
  await m.goto(`${BASE}/b/${formId}/bearbeiten`);
  await m.waitForSelector("[data-question='6']");
  await m.locator("[data-question='6']").tap();
  await m.waitForTimeout(900);
  const auf = await m.evaluate(() => ({ fokus: document.activeElement?.tagName, top: Math.round(document.querySelector("section[aria-label^='Frage ']").getBoundingClientRect().top) }));
  check("aufklappenOhneTastatur", auf.fokus !== "TEXTAREA" && auf.fokus !== "INPUT", JSON.stringify(auf));
  check("karteObenImBild", auf.top >= 50 && auf.top < 200, JSON.stringify(auf));
  await m.screenshot({ path: OUT + "60-editor-handy-aufgeklappt.png" });
  // Tippen: Feld antippen, Tastatur simulieren (sichtbarer Bereich wird kleiner)
  const vorher = await m.evaluate(() => scrollY);
  await m.locator("section[aria-label^='Frage '] textarea[aria-label=Fragetext]").tap();
  await m.setViewportSize({ width: 393, height: 470 });
  await m.waitForTimeout(900);
  const tip = await m.evaluate(() => {
    const r = document.querySelector("section[aria-label^='Frage '] textarea").getBoundingClientRect();
    const btn = document.querySelector("button.btn.primary:not([data-cta])");
    return { scrollY: Math.round(scrollY), feldSichtbar: r.top >= 0 && r.bottom <= innerHeight, vorschauKnopf: btn ? getComputedStyle(btn).display : "fehlt" };
  });
  check("seiteBleibtBeimTippen", tip.scrollY > 100 && Math.abs(tip.scrollY - vorher) < 400, JSON.stringify({ vorher, ...tip }));
  check("feldSichtbarBeimTippen", tip.feldSichtbar, JSON.stringify(tip));
  check("vorschauKnopfWegBeimTippen", tip.vorschauKnopf === "none", JSON.stringify(tip));
  await m.keyboard.type(" geändert");
  // Weg-Scrollen geht (früher sprang die Seite zurück nach oben)
  await m.mouse.wheel(0, -200);
  await m.evaluate(() => window.scrollBy(0, -200));
  await m.waitForTimeout(500);
  const weg = await m.evaluate(() => Math.round(scrollY));
  check("wegScrollenGeht", weg > 0 && weg < tip.scrollY, JSON.stringify({ weg, vorher: tip.scrollY }));
  await m.screenshot({ path: OUT + "61-editor-handy-tippen.png" });
  await m.setViewportSize({ width: 393, height: 852 });
  // Zuklappen am Handy: Pfeil im Fuß
  await m.locator("section[aria-label^='Frage '] footer button[aria-label=Zuklappen]").tap();
  await m.waitForTimeout(400);
  check("zuklappenHandy", (await m.locator("section[aria-label^='Frage ']").count()) === 0);
  check("textGespeichertAngezeigt", (await m.locator("[data-question='6']").innerText()).includes("geändert"));
  await m.screenshot({ path: OUT + "62-editor-handy-zu.png" });
} catch (e) {
  errors.push("Abbruch: " + e.message.split("\n")[0]);
} finally {
  if (formId && UUID.test(formId)) {
    const r = await fetch(`${SB}/forms?id=eq.${formId}&settings->>test=eq.true`, { method: "DELETE", headers: { apikey: KEY, Prefer: "return=representation" } }).then((x) => x.json());
    check("aufgeraeumt", r.length === 1);
  }
  await browser.close();
}
console.log(JSON.stringify({ errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
