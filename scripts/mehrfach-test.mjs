// Test Mehrfachauswahl mit vielen Optionen (9, max. 3): Passt nicht alles in die Antwort-Box, zeigt sie Verlauf + „mehr ↓“;
// ganz unten verschwindet der Hinweis. WEITER! und Sprechblase stehen wie bei einer kurzen Frage (0 px). Handy 393 × 852 und 375 × 667.
// DATENSCHUTZ: eigener Testbogen (/neu?test=1), Aufräumen per REST mit test=true UND exakter id.
// Aufruf: node scripts/mehrfach-test.mjs [BASE_URL]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3123";
const OUT = ".shots/";
const NAME = `E2E Mehrfach ${Date.now().toString(36)}`;
fs.mkdirSync(OUT, { recursive: true });
const SB_URL = "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const SB_KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const rest = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Prefer: "return=representation", ...init.headers } }).then((r) => r.json());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OPTIONS = ["Speaker", "Räume & Technik", "Infos vorab", "Infos vor Ort", "Aufgabe & Challenge-Geber", "Checkpoints", "Essen", "Thema Maritim", "Zusammenarbeit mit anderen"];

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const checks = {};
const check = (n, ok, d = "") => { checks[n] = ok; if (!ok) errors.push(`Check fehlgeschlagen: ${n} ${d}`); };
async function page(viewport, mobile, login = true) {
  const c = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  if (login) await c.addInitScript(() => localStorage.setItem("claus-e2e", "1"));
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  p.on("dialog", (d) => { errors.push(`Nativer Dialog: ${d.message()}`); d.dismiss(); });
  return p;
}
const y = async (p, sel) => Math.round(((await p.locator(sel).first().boundingBox())?.y ?? -1) * 10) / 10;
const more = (p) => p.evaluate(() => {
  const m = document.querySelector("[data-zone=body] [data-more]");
  const s = document.querySelector("[data-zone=body] [data-scroll]");
  const r = m.getBoundingClientRect();
  return { sichtbar: getComputedStyle(m).opacity === "1", imBild: r.top >= 0 && r.bottom <= innerHeight, ueberlauf: s.getAttribute("data-overflow"), scrollt: s.scrollHeight > s.clientHeight + 2 };
});
let formId;
try {
  const a = await page({ width: 1280, height: 900 }, false);
  await a.goto(`${BASE}/neu?test=1`);
  await a.fill("#name", NAME);
  await a.click("button:has-text('Bogen anlegen')");
  await a.waitForURL(/\/bearbeiten/);
  formId = a.url().split("/b/")[1].split("/")[0];
  const active = () => a.locator("section[aria-label^='Frage ']");
  async function add(kind, label, options) {
    await a.click("button[aria-label='Frage hinzufügen']");
    await a.waitForTimeout(300);
    await active().locator("textarea[aria-label=Fragetext]").fill(label);
    if (kind !== "Auswahl") {
      await active().locator("button[aria-label=Frageart]").click();
      await active().locator(`[role=option]:has-text("${kind}")`).first().click();
    }
    for (let i = 0; i < options.length; i++) {
      const inputs = active().locator("input[aria-label^='Antwort ']");
      if ((await inputs.count()) <= i) await inputs.nth(i - 1).press("Enter");
      await inputs.nth(i).fill(options[i]);
    }
  }
  await add("Auswahl", "Als was bist du hier?", ["Student:in", "Mentor:in", "Orga"]);
  await add("Mehrfachauswahl", "Was lief richtig gut?", OPTIONS);
  await active().locator("button[aria-label='Höchstens so viele Antworten']").click();
  await active().locator("[role=option]:has-text('3')").first().click();
  await a.click("main [data-cta]");
  await a.click("button:has-text('Live schalten')");
  await a.waitForSelector("[role=radiogroup][aria-label=Status]");
  const link = await a.locator("#share-link").inputValue();
  const qs = await rest(`questions?form_id=eq.${formId}&select=type,options,settings&order=position`);
  check("gespeichert", qs[1]?.type === "multiple_choice" && qs[1]?.options?.length === 9 && qs[1]?.settings?.maxChoices === 3, JSON.stringify(qs[1]));

  for (const vp of [{ width: 393, height: 852 }, { width: 375, height: 667 }]) {
    const m = await page(vp, true, false);
    await m.goto(link);
    await m.waitForSelector("text=Los geht's");
    await m.tap("text=Los geht's");
    await m.waitForTimeout(900);
    const kurz = { button: await y(m, "[data-pill]"), bubble: await y(m, "[data-bubble]") };
    check(`kurzOhneHinweis${vp.height}`, !(await more(m)).sichtbar);
    await m.locator("[role=radio]").first().tap();
    await m.tap("text=WEITER!");
    await m.waitForTimeout(900);
    const lang = { button: await y(m, "[data-pill]"), bubble: await y(m, "[data-bubble]") };
    check(`raster${vp.height}`, kurz.button === lang.button && kurz.bubble === lang.bubble, JSON.stringify({ kurz, lang }));
    const vorher = await more(m);
    check(`hinweisSichtbar${vp.height}`, vorher.scrollt && vorher.ueberlauf === "true" && vorher.sichtbar && vorher.imBild, JSON.stringify(vorher));
    await m.screenshot({ path: OUT + `50-mehrfach-${vp.height}.png` });
    // Tippen auf „mehr ↓“ scrollt weiter; ganz unten verschwindet der Hinweis
    await m.tap("[data-zone=body] [data-more]");
    await m.waitForTimeout(600);
    await m.evaluate(() => { const s = document.querySelector("[data-zone=body] [data-scroll]"); s.scrollTop = s.scrollHeight; });
    await m.waitForTimeout(500);
    const unten = await more(m);
    check(`hinweisWegUnten${vp.height}`, unten.ueberlauf === "false" && !unten.sichtbar, JSON.stringify(unten));
    await m.screenshot({ path: OUT + `51-mehrfach-unten-${vp.height}.png` });
    await m.locator("[role=checkbox]").last().tap();
    check(`letzteOptionWaehlbar${vp.height}`, (await m.locator("[role=checkbox]").last().getAttribute("aria-checked")) === "true");
    check(`buttonBleibt${vp.height}`, (await y(m, "[data-pill]")) === lang.button);
    await m.context().close();
  }
} catch (e) {
  errors.push(`Abbruch: ${e.message.split("\n")[0]}`);
} finally {
  if (formId && UUID.test(formId)) checks.aufgeraeumt = (await rest(`forms?id=eq.${formId}&settings->>test=eq.true`, { method: "DELETE" })).length;
  await browser.close();
}
console.log(JSON.stringify({ checks, errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
