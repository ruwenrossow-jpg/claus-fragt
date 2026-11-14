// E2E-Test Tafel-Modus (Menti): Moderation am Beamer + 3 Handys gleichzeitig. Screenshots nach .shots/tafel-*.png
// DATENSCHUTZ: Testbogen nur über /neu?test=1 (settings.test = true); Aufräumen per REST mit test=true UND exakter id.
// Aufruf: node scripts/tafel-test.mjs [BASE_URL] [--keep]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3000";
const KEEP = process.argv.includes("--keep");
const OUT = ".shots/";
const NAME = `E2E Tafel ${Date.now().toString(36)}`;
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries((fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "").split("\n").map((l) => l.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL || "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const SB_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const rest = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers } }).then((r) => r.json());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const checks = {};
const check = (name, ok, detail = "") => {
  checks[name] = ok;
  if (!ok) errors.push(`Check fehlgeschlagen: ${name} ${detail}`);
};
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()} | ${p.url()}`));
  p.on("dialog", (d) => {
    errors.push(`Nativer Dialog: ${d.type()}`);
    d.dismiss();
  });
};
const page = async (viewport, mobile = false) => {
  const p = await (await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })).newPage();
  watch(p);
  return p;
};
const y = async (p, sel) => Math.round(((await p.locator(sel).first().boundingBox())?.y ?? -1) * 10) / 10;
const raster = [];
const measure = async (p, name) => {
  await p.waitForTimeout(700);
  raster.push({ name, button: await y(p, "[data-pill]"), bubble: await y(p, "[data-bubble]") });
};

let formId;
try {
  const admin = await page({ width: 1280, height: 900 });
  await admin.goto(`${BASE}/neu?test=1`);
  await admin.fill("#name", NAME);
  await admin.click("button:has-text('Bogen anlegen')");
  await admin.waitForURL(/\/bearbeiten/);
  formId = admin.url().split("/b/")[1].split("/")[0];
  check("testFlag", (await rest(`forms?id=eq.${formId}&select=settings`))[0]?.settings?.test === true);
  const active = () => admin.locator("section[aria-label^='Frage ']");
  async function add(kind, label, options = [], tafel = false) {
    await admin.click("button[aria-label='Frage hinzufügen']");
    await admin.waitForTimeout(300);
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
    if (tafel) await active().locator("[role=switch]:has-text('An der Tafel')").click();
  }
  await add("Text (kurz)", "Was nimmst du mit? Ein Wort!", [], true);
  await admin.screenshot({ path: OUT + "tafel-01-editor.png" });
  await add("Auswahl", "Wie war die Stimmung?", ["Mega", "Gut", "Geht so"], true);
  await add("Sterne", "Wie fandest du das Essen?");
  check("headerTafel", await admin.locator("header [data-header-tafel]").isVisible());
  await admin.click("main [data-cta]");
  await admin.click("button:has-text('Live schalten')");
  await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
  check("teilenTafelButton", await admin.locator("[role=dialog] [data-tafel-open]").isVisible());
  await admin.screenshot({ path: OUT + "tafel-02-teilen.png" });
  const link = await admin.locator("#share-link").inputValue();
  await admin.keyboard.press("Escape");
  await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });

  // Beamer
  const tafel = await page({ width: 1280, height: 720 });
  await tafel.goto(`${BASE}/b/${formId}/tafel`);
  await tafel.evaluate((id) => localStorage.removeItem(`tafel:${id}`), formId);
  await tafel.reload();
  await tafel.waitForSelector("text=Handy raus und mitmachen!");

  // 3 Handys
  const phones = [];
  for (let i = 0; i < 3; i++) {
    const p = await page({ width: 393, height: 852 }, true);
    await p.goto(link);
    await p.waitForSelector("text=Los geht's");
    phones.push(p);
  }
  await tafel.waitForSelector("[data-people='3']", { timeout: 15000 });
  check("dreiHandysDabei", true);
  await tafel.screenshot({ path: OUT + "tafel-03-lobby.png" });
  await phones[0].waitForTimeout(500);
  await measure(phones[0], "start");
  for (const p of phones) await p.click("text=Los geht's");
  await phones[0].waitForSelector("text=Schau nach vorne");
  await measure(phones[0], "warten");
  await phones[0].screenshot({ path: OUT + "tafel-04-handy-warten.png" });

  // Frage 1: Wortwolke
  await tafel.click("[data-tafel-next]");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Was nimmst du mit')");
  const words = ["Teamgeist", "teamgeist", "Pizza um Mitternacht"];
  for (const [i, p] of phones.entries()) {
    await p.waitForSelector("input[type=text]", { timeout: 8000 });
    if (i === 0) {
      await measure(p, "tafel-frage");
      // Tastatur simulieren: Feld fokussieren, sichtbare Höhe schrumpft → kompakte Ansicht, Feld + Button über der Tastatur
      await p.focus("input[type=text]");
      await p.setViewportSize({ width: 393, height: 470 });
      await p.waitForTimeout(700);
      const k = await p.evaluate(() => {
        const vis = (sel) => {
          const r = document.querySelector(sel)?.getBoundingClientRect();
          return Boolean(r && r.top >= 0 && r.bottom <= visualViewport.height + 1 && r.height > 0);
        };
        return { typing: Boolean(document.querySelector("[data-typing]")), feld: vis("input[type=text]"), button: vis("[data-pill]"), claus: vis("[data-typing] [data-mini] img") };
      });
      checks.tastatur = k;
      check("tastaturFeldUndButtonSichtbar", k.typing && k.feld && k.button && k.claus, JSON.stringify(k));
      await p.screenshot({ path: OUT + "tafel-05b-handy-tastatur.png" });
      await p.evaluate(() => document.activeElement.blur());
      await p.setViewportSize({ width: 393, height: 852 });
      await p.waitForTimeout(700);
      check("tastaturZu", !(await p.locator("[data-typing]").count()));
    }
    await p.fill("input[type=text]", words[i]);
    if (i === 0) await p.screenshot({ path: OUT + "tafel-05-handy-frage.png" });
    await p.click("button:has-text('Abschicken')");
  }
  await phones[0].waitForSelector("text=Angekommen");
  await measure(phones[0], "angekommen");
  await phones[0].screenshot({ path: OUT + "tafel-06-handy-angekommen.png" });
  await tafel.waitForSelector("[data-count='3']", { timeout: 10000 });
  await tafel.screenshot({ path: OUT + "tafel-07-zaehler.png" });
  await tafel.click("[data-tafel-show]");
  await tafel.waitForSelector("[data-cloud]");
  check("wortwolkeTeamgeist2", (await tafel.locator("[data-word='Teamgeist']").getAttribute("data-count")) === "2");
  await tafel.waitForTimeout(800);
  await tafel.screenshot({ path: OUT + "tafel-08-wortwolke.png" });
  // Antwort ändern (keine zweite Abgabe)
  await phones[2].click("button:has-text('Ändern')");
  await phones[2].fill("input[type=text]", "Pizza");
  await phones[2].click("button:has-text('Abschicken')");
  await phones[2].waitForSelector("text=Angekommen");
  await tafel.waitForSelector("[data-word='Pizza']", { timeout: 8000 });
  check("aendernAktualisiertWolke", (await tafel.locator("[data-word='Pizza um Mitternacht']").count()) === 0);

  // Frage 2: Balken (per Pfeiltaste wie mit dem Presenter-Klicker)
  await tafel.keyboard.press("ArrowRight");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Stimmung')");
  for (const [i, p] of phones.entries()) {
    await p.waitForSelector("text=Wie war die Stimmung?", { timeout: 8000 });
    await p.locator("[role=radio]").nth(i === 2 ? 1 : 0).click();
    await p.click("button:has-text('Abschicken')");
    await p.waitForSelector("text=Angekommen");
  }
  await tafel.waitForSelector("[data-count='3']", { timeout: 10000 });
  await tafel.keyboard.press("z");
  await tafel.waitForSelector("[data-bars]");
  await tafel.waitForTimeout(800);
  await tafel.screenshot({ path: OUT + "tafel-09-balken.png" });

  // Ende des gemeinsamen Teils → Handys: WEITER! → Sterne-Frage allein
  await tafel.click("[data-tafel-next]");
  await tafel.waitForSelector("text=Der gemeinsame Teil ist geschafft");
  await tafel.screenshot({ path: OUT + "tafel-10-ende.png" });
  for (const p of phones) await p.waitForSelector("text=Das war der gemeinsame Teil", { timeout: 8000 });
  await measure(phones[0], "gemeinsam-vorbei");
  await phones[0].screenshot({ path: OUT + "tafel-11-handy-vorbei.png" });
  for (const p of phones) {
    await p.click("text=WEITER!");
    await p.waitForSelector("text=Wie fandest du das Essen?");
    await p.locator("[role=radio]").nth(3).click();
    await p.waitForTimeout(500);
    await p.click("text=WEITER!");
    await p.waitForSelector("text=Ergebnis ansehen");
  }
  await measure(phones[0], "ende");
  // Zurück von der ersten eigenen Frage führt zum Tafel-Screen, nicht zum Start
  await phones[0].click("[data-back]");
  await phones[0].waitForSelector("text=Wie fandest du das Essen?");
  await phones[0].waitForTimeout(500);
  await phones[0].click("[data-back]");
  await phones[0].waitForSelector("text=Das war der gemeinsame Teil");
  check("zurueckZurTafel", true);

  const responses = await rest(`responses?form_id=eq.${formId}&select=id,answers(question_id,value)`);
  check("dreiAbgaben", responses.length === 3, `${responses.length}`);
  check("jeDreiAntworten", responses.every((r) => r.answers.length === 3), JSON.stringify(responses.map((r) => r.answers.length)));

  const spread = (k) => Math.max(...raster.map((r) => r[k])) - Math.min(...raster.map((r) => r[k]));
  checks.raster = { buttonSpread: spread("button"), bubbleSpread: spread("bubble"), rows: raster };
  check("rasterGleich", spread("button") === 0 && spread("bubble") === 0);
} catch (e) {
  errors.push(`Abbruch: ${e.message.split("\n").slice(0, 3).join(" ")}`);
} finally {
  if (formId && UUID.test(formId) && !KEEP) {
    const rows = await rest(`forms?id=eq.${formId}&settings->>test=eq.true`, { method: "DELETE" });
    checks.aufgeraeumt = Array.isArray(rows) ? rows.length : rows;
  }
  await browser.close();
  console.log(JSON.stringify({ checks, errors: errors.length ? errors : "none" }, null, 1));
}
