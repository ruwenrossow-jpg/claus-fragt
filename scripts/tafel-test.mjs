// E2E-Test Tafel-Modus (Menti), Ruwens Hackathon-Ablauf: Steuerung am Laptop → Beamer öffnen → Lobby (3 Handys) → 4 Fragen gemeinsam
// (Wortwolke, Karten, Balken; Nachzügler) → allein weiter (2 Fragen) → Ergebnis; Beamer/Steuerung am Handy. Screenshots nach .shots/tafel-*.png
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
  // ---------- Ersteller:in baut den Hackathon-Bogen: 4 Fragen an der Tafel, 2 allein ----------
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
  await add("Text (kurz)", "Ein Wort zum Hackathon?", [], true);
  check("pflichtStandard", (await active().locator("[role=switch]:has-text('Pflicht')").getAttribute("aria-checked")) === "true");
  await admin.screenshot({ path: OUT + "tafel-01-editor.png" });
  await add("Text (Absatz)", "Was nimmst du mit?", [], true);
  await add("Auswahl", "Würdest du wiederkommen?", ["Sofort", "Vielleicht", "Eher nicht"], true);
  await add("Sterne", "Wie war die Stimmung?", [], true);
  await add("Sterne", "Wie fandest du das Essen?");
  await add("Text (kurz)", "Was sollen wir ändern?");
  check("headerTafelZurSteuerung", ((await admin.locator("header [data-header-tafel]").getAttribute("href")) ?? "").endsWith("/tafel/steuerung"));
  await admin.click("main [data-cta]");
  await admin.click("button:has-text('Live schalten')");
  await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
  check("teilenTafelButton", await admin.locator("[role=dialog] [data-tafel-open]").isVisible());
  await admin.screenshot({ path: OUT + "tafel-02-teilen.png" });
  const link = await admin.locator("#share-link").inputValue();
  await admin.keyboard.press("Escape");
  await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });

  // ---------- Steuerung (Laptop) → Beamer öffnen ----------
  const ctl = admin;
  await ctl.goto(`${BASE}/b/${formId}/tafel/steuerung`);
  await ctl.waitForSelector("text=So startest du die Tafel", { timeout: 10000 });
  await ctl.screenshot({ path: OUT + "tafel-03-steuerung-start.png" });
  const [tafel] = await Promise.all([ctl.context().waitForEvent("page"), ctl.click("main button:has-text('Beamer öffnen')")]);
  watch(tafel);
  await tafel.setViewportSize({ width: 1280, height: 720 });
  await tafel.evaluate((id) => localStorage.removeItem(`tafel:${id}`), formId);
  await tafel.reload();
  await tafel.waitForSelector("text=Handy raus und mitmachen!");
  await ctl.waitForSelector("[data-beamer=on]", { timeout: 10000 });
  check("steuerungVerbunden", true);

  // ---------- Lobby: 3 Handys kommen rein und warten ----------
  const phones = [];
  for (let i = 0; i < 3; i++) {
    const p = await page({ width: 393, height: 852 }, true);
    await p.goto(link);
    await p.waitForSelector("text=Los geht's");
    phones.push(p);
  }
  await tafel.waitForSelector("[data-people='3']", { timeout: 15000 });
  await ctl.waitForSelector("[data-people='3']", { timeout: 10000 });
  check("lobbyZaehltDrei", true);
  await tafel.screenshot({ path: OUT + "tafel-04-lobby.png" });
  await ctl.screenshot({ path: OUT + "tafel-05-steuerung-lobby.png" });
  await measure(phones[0], "start");
  for (const p of phones) await p.click("text=Los geht's");
  await phones[0].waitForSelector("text=Schau nach vorne");
  await measure(phones[0], "warten");
  await phones[0].screenshot({ path: OUT + "tafel-06-handy-warten.png" });
  // Beamer: Steuerung blendet aus, wenn die Maus ruht
  await tafel.waitForTimeout(3600);
  check("beamerSteuerungBlendetAus", (await tafel.evaluate(() => getComputedStyle(document.querySelector("[data-tafel-next]").parentElement.parentElement).opacity)) === "0");

  // ---------- Frage 1 (Wortwolke), gesteuert vom Laptop ----------
  await ctl.click("[data-remote-next]");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Ein Wort')");
  const words = ["Teamgeist", "teamgeist", "Pizza"];
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
      check("tastaturFeldUndButtonSichtbar", k.typing && k.feld && k.button && k.claus, JSON.stringify(k));
      await p.evaluate(() => document.activeElement.blur());
      await p.setViewportSize({ width: 393, height: 852 });
      await p.waitForTimeout(700);
    }
    await p.fill("input[type=text]", words[i]);
    await p.click("button:has-text('Abschicken')");
  }
  await phones[0].waitForSelector("text=Angekommen");
  await measure(phones[0], "angekommen");
  await ctl.waitForSelector("[data-count='3']", { timeout: 10000 });
  check("steuerungSiehtAntwortenVorDemZeigen", (await ctl.locator("[data-cloud]").count()) === 1 && (await tafel.locator("[data-cloud]").count()) === 0);
  await ctl.screenshot({ path: OUT + "tafel-07-steuerung-frage.png" });
  await ctl.click("[data-remote-show]");
  await tafel.waitForSelector("[data-cloud]");
  check("wortwolkeTeamgeist2", (await tafel.locator("[data-cloud] [data-word='Teamgeist']").getAttribute("data-count")) === "2");
  await tafel.waitForTimeout(800);
  await tafel.screenshot({ path: OUT + "tafel-08-wortwolke.png" });

  // ---------- Frage 2 (Karten) + Nachzügler steigt mitten ein ----------
  await ctl.click("[data-remote-next]");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Was nimmst du mit')");
  const late = await page({ width: 393, height: 852 }, true);
  await late.goto(link);
  await late.waitForTimeout(2500);
  await late.click("text=Los geht's");
  await late.waitForSelector("text=Was nimmst du mit?", { timeout: 8000 });
  check("nachzueglerLandetInAktuellerFrage", true);
  phones.push(late);
  const cards = ["Wie man in 24 h ein Team aufbaut", "Mut zum Pitchen", "Neue Kontakte", "Prototyp statt Folien"];
  for (const [i, p] of phones.entries()) {
    await p.waitForSelector("textarea", { timeout: 8000 });
    await p.fill("textarea", cards[i]);
    await p.click("button:has-text('Abschicken')");
    await p.waitForSelector("text=Angekommen");
  }
  await ctl.waitForSelector("[data-count='4']", { timeout: 10000 });
  await ctl.click("[data-remote-view]");
  await ctl.click("[data-remote-show]");
  await tafel.waitForSelector("[data-cards]");
  await tafel.waitForTimeout(1000);
  check("vierKarten", (await tafel.locator("[data-cards] [data-card]").count()) === 4);
  await tafel.screenshot({ path: OUT + "tafel-09-karten.png" });

  // ---------- Frage 3 (Auswahl) und 4 (Sterne): Balken ----------
  for (const [label, pick] of [["Würdest du wiederkommen?", 0], ["Wie war die Stimmung?", 4]]) {
    await ctl.click("[data-remote-next]");
    await tafel.waitForSelector(`[data-tafel-question]:has-text("${label}")`);
    for (const [i, p] of phones.entries()) {
      await p.waitForSelector(`text=${label}`, { timeout: 8000 });
      await p.locator("[role=radio]").nth(i === 3 ? 1 : pick).click();
      await p.click("button:has-text('Abschicken')");
      await p.waitForSelector("text=Angekommen");
    }
    await ctl.waitForSelector("[data-count='4']", { timeout: 10000 });
    await tafel.keyboard.press("z"); // Presenter-Taste am Beamer
    await tafel.waitForSelector("[data-bars]");
  }
  await tafel.waitForTimeout(800);
  await tafel.screenshot({ path: OUT + "tafel-10-balken.png" });
  // Sprung über den Ablauf: zurück zu Frage 1 und wieder zur letzten
  await ctl.click("[data-step='1']");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Ein Wort')");
  await ctl.click("[data-step='4']");
  await tafel.waitForSelector("[data-tafel-question]:has-text('Stimmung')");
  check("ablaufSprung", true);

  // ---------- Ende des gemeinsamen Teils → allein weiter ----------
  await ctl.click("[data-remote-next]");
  await tafel.waitForSelector("text=Der gemeinsame Teil ist geschafft");
  await tafel.screenshot({ path: OUT + "tafel-11-ende.png" });
  for (const p of phones) await p.waitForSelector("text=Das war der gemeinsame Teil", { timeout: 8000 });
  await measure(phones[0], "gemeinsam-vorbei");
  await phones[0].screenshot({ path: OUT + "tafel-12-handy-vorbei.png" });
  check("nachzueglerHolt1Nach", await late.locator("text=noch 3 Fragen").count() === 1, await late.locator("[data-zone=body]").innerText());
  for (const p of phones) {
    await p.click("text=WEITER!");
    if (p === late) {
      await p.waitForSelector("text=Ein Wort zum Hackathon?");
      await p.fill("input[type=text]", "Teamgeist");
      await p.waitForTimeout(500);
      await p.click("text=WEITER!");
    }
    await p.waitForSelector("text=Wie fandest du das Essen?");
    await p.locator("[role=radio]").nth(3).click();
    await p.waitForTimeout(500);
    await p.click("text=WEITER!");
    await p.waitForSelector("text=Was sollen wir ändern?");
    await p.fill("input[type=text]", "Mehr Kaffee");
    await p.waitForTimeout(500);
    await p.click("text=WEITER!");
    await p.waitForSelector("text=Ergebnis ansehen");
  }
  await measure(phones[0], "ende");
  await phones[0].click("[data-back]");
  await phones[0].waitForSelector("text=Was sollen wir ändern?");
  await phones[0].waitForTimeout(500);
  await phones[0].click("[data-back]");
  await phones[0].waitForSelector("text=Wie fandest du das Essen?");
  await phones[0].waitForTimeout(500);
  await phones[0].click("[data-back]");
  await phones[0].waitForSelector("text=Das war der gemeinsame Teil");
  check("zurueckZurTafel", true);

  const responses = await rest(`responses?form_id=eq.${formId}&select=id,answers(question_id,value)`);
  check("vierAbgaben", responses.length === 4, `${responses.length}`);
  check("jeSechsAntworten", responses.every((r) => r.answers.length === 6), JSON.stringify(responses.map((r) => r.answers.length)));

  // ---------- Beamer und Steuerung auf dem Handy: nichts überlappt, nichts läuft über ----------
  await ctl.click("[data-remote-restart]");
  await tafel.waitForSelector("text=Handy raus und mitmachen!");
  for (const [pg, name] of [[tafel, "beamer"], [ctl, "steuerung"]]) {
    await pg.setViewportSize({ width: 390, height: 664 });
    await pg.waitForTimeout(800);
    await pg.mouse.move(10, 10);
    const r = await pg.evaluate(() => {
      scrollTo(0, document.documentElement.scrollHeight);
      const bar = document.querySelector("[data-tafel-next], [data-remote-next]")?.closest("div[class]")?.parentElement?.getBoundingClientRect();
      const qr = document.querySelector("img[alt^='QR-Code']")?.getBoundingClientRect();
      return { ueberlauf: document.documentElement.scrollWidth > innerWidth + 1, barSichtbar: Boolean(bar && bar.bottom <= innerHeight + 1 && bar.top >= 0), qrUnterBar: Boolean(qr && bar && qr.bottom > bar.top + 1) };
    });
    check(`${name}Handy`, !r.ueberlauf && r.barSichtbar && !r.qrUnterBar, JSON.stringify(r));
    await pg.screenshot({ path: OUT + `tafel-13-${name}-handy.png` });
  }

  const spread = (k) => Math.max(...raster.map((r) => r[k])) - Math.min(...raster.map((r) => r[k]));
  checks.raster = { buttonSpread: spread("button"), bubbleSpread: spread("bubble") };
  check("rasterGleich", spread("button") === 0 && spread("bubble") === 0, JSON.stringify(raster));
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
