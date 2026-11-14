// Test der Ablauf-Idee im Editor (Hover-Vorschläge, Übernehmen, Schiene am rechten Rand) auf Desktop und Handy.
// DATENSCHUTZ wie visual-test.mjs: eigener Testbogen über /neu?test=1, Aufräumen nur per exakter id + settings.test.
// Aufruf: node scripts/ablauf-test.mjs [BASE_URL]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3123";
const OUT = ".shots/";
const RUN = Date.now().toString(36);
const NAME = `E2E Ablauf ${RUN}`;
fs.mkdirSync(OUT, { recursive: true });
const SB_URL = "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const SB_KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const rest = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Prefer: "return=representation", ...init.headers } }).then((r) => r.json());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const checks = {};
const check = (n, ok, d = "") => { checks[n] = ok; if (!ok) errors.push(`Check fehlgeschlagen: ${n} ${d}`); };
async function page(viewport, mobile) {
  const c = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  await c.addInitScript(() => localStorage.setItem("claus-e2e", "1"));
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  p.on("dialog", (d) => { errors.push(`Nativer Dialog: ${d.message()}`); d.dismiss(); });
  return p;
}
let formId;
try {
  const d = await page({ width: 1280, height: 900 }, false);
  await d.goto(`${BASE}/neu?test=1`);
  await d.fill("#name", NAME);
  await d.click("button:has-text('Bogen anlegen')");
  await d.waitForURL(/\/bearbeiten/);
  formId = d.url().split("/b/")[1].split("/")[0];
  await d.waitForSelector("[data-ablauf]");
  check("fuenfFelder", (await d.locator("[data-ablauf] > ol > li").count()) === 5);
  await d.hover("[data-ablauf] li:nth-child(3) button");
  await d.waitForSelector("[data-ablauf-pop]");
  await d.waitForTimeout(300);
  await d.screenshot({ path: OUT + "30-ablauf-hover.png" });
  check("hoverZeigtVorschlaege", (await d.locator("[data-ablauf-pop] ul button").count()) === 3);
  await d.mouse.move(5, 5);
  await d.waitForTimeout(200);
  check("wegfahrenSchliesst", (await d.locator("[data-ablauf-pop]").count()) === 0);
  // Vorschläge übernehmen: Bereich 5, dann 2 → 2 muss vor 5 landen
  await d.hover("[data-ablauf] li:nth-child(5) button");
  await d.locator("[data-ablauf-pop] button:has-text('Würdest du wiederkommen?')").click();
  await d.hover("[data-ablauf] li:nth-child(2) button");
  await d.locator("[data-ablauf-pop] button:has-text('Ehrlich jetzt')").click();
  await d.hover("[data-ablauf] li:nth-child(3) button");
  await d.locator("[data-ablauf-pop] button:has-text('hängen geblieben')").click();
  await d.waitForTimeout(2500);
  const qs = await rest(`questions?form_id=eq.${formId}&select=label,step,type,position,options,settings&order=position`);
  check("gespeichertInReihenfolge", qs.map((q) => q.step).join() === "2,3,5", JSON.stringify(qs.map((q) => [q.step, q.label])));
  check("stufenUebernommen", qs.find((q) => q.step === 3)?.options?.[3] === "Direkt anwendbar");
  check("haekchen", (await d.locator("[data-ablauf] button[data-done]").count()) === 3);
  for (let i = 0; i < 4; i++) await d.click("button[aria-label='Frage hinzufügen']");
  await d.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await d.waitForSelector("[data-ablauf-rail]");
  await d.hover("[data-ablauf-rail] li:nth-child(4) button");
  await d.waitForSelector("[data-ablauf-rail] [data-ablauf-pop]");
  await d.waitForTimeout(300);
  await d.screenshot({ path: OUT + "31-ablauf-schiene.png" });
  const rail = await d.locator("[data-ablauf-rail]").boundingBox();
  const phone = await d.locator("aside[aria-label=Vorschau]").boundingBox();
  check("schieneNichtUeberHandy", rail.x + rail.width <= phone.x + 4, JSON.stringify({ rail, phone }));
  await d.evaluate(() => window.scrollTo(0, 0));
  await d.waitForTimeout(300);
  check("schieneWegOben", (await d.locator("[data-ablauf-rail]").count()) === 0);

  const m = await page({ width: 393, height: 852 }, true);
  await m.goto(`${BASE}/b/${formId}/bearbeiten`);
  await m.waitForSelector("[data-ablauf]");
  await m.screenshot({ path: OUT + "32-ablauf-handy.png" });
  await m.tap("[data-ablauf] li:nth-child(5) button");
  await m.waitForSelector("[data-ablauf-pop]");
  await m.waitForTimeout(200);
  check("tippenOeffnet", (await m.locator("[data-ablauf-pop]").count()) === 1);
  const pop = await m.locator("[data-ablauf-pop]").boundingBox();
  check("popImBild", pop.x >= 0 && pop.x + pop.width <= 393, JSON.stringify(pop));
  await m.screenshot({ path: OUT + "33-ablauf-handy-tipp.png" });
  await m.tap("h1, [data-ablauf] p");
  await m.waitForTimeout(200);
  check("tippenDraussenSchliesst", (await m.locator("[data-ablauf-pop]").count()) === 0);
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await m.waitForSelector("[data-ablauf-rail]");
  await m.tap("[data-ablauf-rail] li:nth-child(1) button");
  await m.waitForSelector("[data-ablauf-rail] [data-ablauf-pop]");
  const pop2 = await m.locator("[data-ablauf-rail] [data-ablauf-pop]").boundingBox();
  check("schienePopImBild", pop2.x >= 0, JSON.stringify(pop2));
  await m.waitForTimeout(300);
  await m.screenshot({ path: OUT + "34-ablauf-handy-schiene.png" });
} catch (e) {
  errors.push(`Abbruch: ${e.message.split("\n")[0]}`);
} finally {
  if (formId && UUID.test(formId)) checks.aufgeraeumt = (await rest(`forms?id=eq.${formId}&settings->>test=eq.true`, { method: "DELETE" })).length;
  await browser.close();
}
console.log(JSON.stringify({ checks, errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
