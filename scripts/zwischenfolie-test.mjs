// Test Zwischenfolie: im Editor anlegen (keine Pflicht/Tafel-Schalter), am Handy ohne Antwort-Box, WEITER! auf gleicher Höhe
// wie bei Fragen (0 px), speichert keine Antwort, fehlt in der Auswertung. DATENSCHUTZ: eigener Testbogen (/neu?test=1), Aufräumen per exakter id.
// Aufruf: node scripts/zwischenfolie-test.mjs [BASE_URL]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3123";
const OUT = ".shots/";
const NAME = `E2E Zwischenfolie ${Date.now().toString(36)}`;
fs.mkdirSync(OUT, { recursive: true });
const SB_URL = "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const SB_KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const rest = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Prefer: "return=representation", ...init.headers } }).then((r) => r.json());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
let formId;
try {
  const a = await page({ width: 1280, height: 900 }, false);
  await a.goto(`${BASE}/neu?test=1`);
  await a.fill("#name", NAME);
  await a.click("button:has-text('Bogen anlegen')");
  await a.waitForURL(/\/bearbeiten/);
  formId = a.url().split("/b/")[1].split("/")[0];
  const active = () => a.locator("section[aria-label^='Frage ']");
  async function add(kind, label) {
    await a.click("button[aria-label='Frage hinzufügen']");
    await active().locator("textarea[aria-label=Fragetext]").fill(label);
    await active().locator("button[aria-label=Frageart]").click();
    await active().locator(`[role=option]:has-text("${kind}")`).first().click();
  }
  await add("Zwischenfolie", "Jetzt geht's ums Essen!");
  check("keinePflichtBeiFolie", (await active().locator("[role=switch]").count()) === 0);
  await a.screenshot({ path: OUT + "40-zwischenfolie-editor.png" });
  await add("Sterne", "Wie war das Essen?");
  // Typwechsel zurück: Folie → Text (kurz) wird wieder Pflicht
  await add("Zwischenfolie", "Wird umgewandelt");
  await active().locator("button[aria-label=Frageart]").click();
  await active().locator(`[role=option]:has-text("Text (kurz)")`).first().click();
  check("zurueckWirdPflicht", (await active().locator("[role=switch]:has-text('Pflicht')").getAttribute("aria-checked")) === "true");
  await active().locator("textarea[aria-label=Fragetext]").fill("Ein Wort zum Essen?");
  await a.click("main [data-cta]");
  await a.click("button:has-text('Live schalten')");
  await a.waitForSelector("[role=radiogroup][aria-label=Status]");
  const link = await a.locator("#share-link").inputValue();
  const qs = await rest(`questions?form_id=eq.${formId}&select=type,required,settings&order=position`);
  check("gespeichertAlsInfo", qs[0]?.type === "long_text" && qs[0]?.settings?.display === "info" && qs[0]?.required === false, JSON.stringify(qs[0]));

  const m = await page({ width: 393, height: 852 }, true, false);
  await m.goto(link);
  await m.waitForSelector("text=Los geht's");
  check("chipZaehltNurFragen", (await m.locator("text=2 kurze Fragen").count()) === 1, await m.locator("main").innerText().catch(() => ""));
  await m.tap("text=Los geht's");
  await m.waitForTimeout(900);
  const folie = { button: await y(m, "[data-pill]"), bubble: await y(m, "[data-bubble]") };
  check("folieOhneEingabe", (await m.locator("input, textarea, [role=radio], [role=checkbox], [role=radiogroup]").count()) === 0);
  check("folieText", (await m.locator("[data-bubble]").innerText()).includes("Jetzt geht's ums Essen!"));
  await m.screenshot({ path: OUT + "41-zwischenfolie-handy.png" });
  await m.tap("text=WEITER!");
  await m.waitForTimeout(900);
  const frage = { button: await y(m, "[data-pill]"), bubble: await y(m, "[data-bubble]") };
  check("rasterGleich", folie.button === frage.button, JSON.stringify({ folie, frage }));
  await m.locator("[role=radio]").nth(3).tap();
  await m.tap("text=WEITER!");
  await m.waitForTimeout(700);
  await m.fill("input[type=text]", "Lecker");
  await m.tap("text=WEITER!");
  await m.waitForTimeout(2500);
  const answers = await rest(`answers?select=value,question_id,responses!inner(form_id)&responses.form_id=eq.${formId}`);
  check("nurZweiAntworten", Array.isArray(answers) && answers.length === 2, JSON.stringify(answers));

  await a.goto(`${BASE}/b/${formId}/ergebnisse`);
  await a.waitForSelector("text=Wie war das Essen?");
  check("ergebnisOhneFolie", (await a.locator("text=Jetzt geht's ums Essen!").count()) === 0);
} catch (e) {
  errors.push(`Abbruch: ${e.message.split("\n")[0]}`);
} finally {
  if (formId && UUID.test(formId)) checks.aufgeraeumt = (await rest(`forms?id=eq.${formId}&settings->>test=eq.true`, { method: "DELETE" })).length;
  await browser.close();
}
console.log(JSON.stringify({ checks, errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
