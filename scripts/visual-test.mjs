// End-to-End-Test aller Journeys mit Screenshots nach .shots/ (braucht installiertes Google Chrome).
// Ersteller:in: Meine Bögen → Neuer Bogen (Validierung) → Editor (alle Fragearten, Typwechsel, Optionen, Pflicht, Verschieben,
//   Duplizieren, Entfernen, Autosave + Neuladen, Vorschau, Handy) → Teilen (Entwurf, Live, Link, QR/PNG, Beamer, Schließen/Öffnen)
//   → Ergebnisse (leer, mit Antworten, Filter, CSV) → Bogen duplizieren → Papierkorb + Wiederherstellen.
// Teilnehmende: Entwurf/Live/Geschlossen/Gelöscht/falscher Slug, alle Fragearten, Pflicht, Zurück, ändern ohne Doppel-Abgabe,
//   Doppeltipp, Speicherfehler + erneut versuchen, lange Texte/viele Optionen. Raster-Messung (Button/Blase) auf 4 Viewports.
// Fehler-/Randzustände: unbekannte ids, 404, alte Links, Supabase-Fehler, Metadaten.
//
// DATENSCHUTZ: Jeder Testbogen entsteht über /neu?test=1 (settings.test = true, Name „E2E …“). Aufgeräumt wird am Ende per REST
// NUR mit Filter settings->>test=eq.true UND exakter id. Fremde Bögen werden nie geöffnet, geändert oder gelöscht.
// Native Dialoge (confirm/alert/beforeunload) und Konsolenfehler zählen als Fehler.
// Aufruf: node scripts/visual-test.mjs [BASE_URL] [--keep]
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3000";
const KEEP = process.argv.includes("--keep");
const OUT = ".shots/";
const RUN = Date.now().toString(36);
const NAME = `E2E Builder ${RUN}`;
const NAME_EDGE = `E2E Randfälle ${RUN}`;
fs.mkdirSync(OUT, { recursive: true });

// ---------- Supabase-REST nur fürs Aufräumen der eigenen Testbögen ----------
const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split("\n")
    .map((l) => l.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL || "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const SB_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const rest = (path, init = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers } }).then((r) => r.json());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** ids aller Testbögen dieses Laufs */
const created = new Set();
/** Hartes Löschen NUR für eigene Testbögen: exakte id UND settings.test = true. */
async function hardDeleteTestForm(id) {
  if (!UUID.test(id)) throw new Error(`keine gültige id: ${id}`);
  const rows = await rest(`forms?id=eq.${id}&settings->>test=eq.true`, { method: "DELETE" });
  return Array.isArray(rows) ? rows.length : 0;
}
async function formRow(id) {
  return (await rest(`forms?id=eq.${id}&select=id,title,status,settings`))[0];
}

// ---------- Browser + Fehlerprotokoll ----------
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const checks = {};
/** Erwartete Fehler (z. B. absichtlich abgebrochene Requests, 404-Seite) – nur während eines Schritts erlaubt */
let allowed = [];
const push = (msg) => !allowed.some((re) => re.test(msg)) && errors.push(msg);
async function allowing(patterns, fn) {
  allowed = patterns;
  try {
    return await fn();
  } finally {
    allowed = [];
  }
}
const watch = (p) => {
  p.on("pageerror", (e) => push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && push(`console: ${m.text()} | ${p.url()}`));
  p.on("response", async (r) => {
    if (r.status() < 400) return;
    const body = await r.text().catch(() => "");
    push(`HTTP ${r.status()} ${r.request().method()} ${r.url().split("?")[0]} ${body.slice(0, 160)} | Seite: ${p.url()}`);
  });
  p.on("dialog", (d) => {
    errors.push(`Nativer Dialog: ${d.type()} ${d.message()}`);
    d.dismiss();
  });
};
const ctx = (viewport, mobile = false) => browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, acceptDownloads: true });
const page = async (viewport, mobile) => {
  const p = await (await ctx(viewport, mobile)).newPage();
  watch(p);
  return p;
};
const check = (name, ok, detail = "") => {
  checks[name] = ok;
  if (!ok) errors.push(`Check fehlgeschlagen: ${name} ${detail}`);
};
const box = async (p, sel) => {
  const b = await p.locator(sel).first().boundingBox();
  return b ? Math.round(b.y * 10) / 10 : null;
};
const PHONE = { width: 393, height: 852 };
/** Referenzposition (393 × 852) von Button und Blase, aus dem ersten Ausfüll-Lauf */
let ref = null;
async function measureMessage(p, name) {
  await p.waitForTimeout(900);
  const m = { button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") };
  if (ref && (Math.abs(m.button - ref.button) > 1 || Math.abs(m.bubble - ref.bubble) > 1)) errors.push(`Raster ${name} weicht ab: ${JSON.stringify(m)} statt ${JSON.stringify(ref)}`);
  (checks.rasterHinweisScreens ??= {})[name] = m;
}

let admin, link, formId, kpis;
try {
  // ======================= Ersteller:in (Desktop) =======================
  admin = await page({ width: 1280, height: 900 });

  // Alte Links und Startseite
  await admin.goto(`${BASE}/`);
  await admin.waitForURL(/\/meine-boegen/);
  await admin.waitForSelector("h1:has-text('Meine Bögen')");
  await admin.waitForSelector("text=Papierkorb");
  await admin.screenshot({ path: OUT + "00-meine-boegen.png" });
  check("startseiteLeitetUm", admin.url().includes("/meine-boegen"));
  check("listeOhneTestboegen", (await admin.locator("li[data-form^='E2E ']").count()) === 0);

  // Supabase-Fehler in der Liste: verständliche Meldung + Nochmal versuchen
  await allowing([/ERR_FAILED|Failed to load resource|Failed to fetch/i], async () => {
    await admin.route("**/rest/v1/forms*", (r) => r.abort());
    await admin.reload();
    await admin.waitForSelector("text=Keine Verbindung zur Datenbank");
    await admin.screenshot({ path: OUT + "00b-liste-fehler.png" });
    await admin.unroute("**/rest/v1/forms*");
    await admin.click("button:has-text('Nochmal versuchen')");
    await admin.waitForSelector("text=Papierkorb");
  });
  check("listeFehlerUndNochmal", true);

  // Neuer Bogen: Validierung ohne Name, Art wählen
  await admin.goto(`${BASE}/neu?test=1`);
  await admin.waitForSelector("text=Was für ein Event ist es?");
  check("titelNeu", (await admin.title()) === "Neuer Bogen · Claus fragt", await admin.title());
  await admin.click("button:has-text('Bogen anlegen')");
  await admin.waitForSelector("text=Bitte gib dem Bogen einen Namen.");
  check("validierungFokus", await admin.evaluate(() => document.activeElement?.id === "name"));
  await admin.fill("#name", NAME);
  await admin.fill("#beschreibung", "Danke, dass du dabei warst! Sag uns kurz, wie es war.");
  await admin.click("[role=radio]:has-text('Lernend')");
  await admin.click("[role=radio]:has-text('Inspirierend')");
  check("artGewaehlt", (await admin.locator("[role=radio][aria-checked=true]").innerText()).includes("Inspirierend"));
  await admin.screenshot({ path: OUT + "01-neu.png" });
  await admin.dblclick("button:has-text('Bogen anlegen')"); // Doppelklick → trotzdem nur ein Bogen
  await admin.waitForURL(/\/bearbeiten/);
  formId = admin.url().split("/b/")[1].split("/")[0];
  created.add(formId);
  await admin.waitForSelector("text=Noch keine Fragen");
  check("testFlagGesetzt", (await formRow(formId))?.settings?.test === true);
  check("keinDoppelterBogen", (await rest(`forms?title=eq.${encodeURIComponent(NAME)}&select=id`)).length === 1);
  await admin.screenshot({ path: OUT + "02-editor-leer.png" });

  // Entwurf: Link aus dem Teilen-Dialog holen (ist gesperrt, bis live)
  await admin.click("header [data-cta]");
  await admin.waitForSelector("button:has-text('Live schalten')");
  link = await admin.locator("#share-link").inputValue();
  await admin.keyboard.press("Escape");

  const active = () => admin.locator("section[aria-label^='Frage ']");
  /** Nach „+ Frage“/„Duplizieren“: Cursor im Fragetext der neuen Karte, Karte etwa in der Bildschirmmitte. */
  async function checkFocusCenter(p, what) {
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const card = document.querySelector("section[aria-label^='Frage ']");
      const el = document.activeElement;
      const b = card.getBoundingClientRect();
      const maxScroll = document.documentElement.scrollHeight - innerHeight;
      return {
        fokus: el?.getAttribute("aria-label") === "Fragetext" && card.contains(el),
        abstandZurMitte: Math.round(b.top + b.height / 2 - innerHeight / 2),
        ganzUnten: Math.abs(scrollY - maxScroll) < 2,
        ganzOben: scrollY < 2,
        hoehe: innerHeight,
      };
    });
    const mittig = Math.abs(r.abstandZurMitte) < r.hoehe * 0.15 || r.ganzUnten || r.ganzOben;
    if (!r.fokus) errors.push(`${what}: Fokus nicht im Fragetext`);
    if (!mittig) errors.push(`${what}: Karte nicht mittig (${r.abstandZurMitte} px daneben)`);
  }
  async function setKind(kind) {
    await active().locator("button[aria-label=Frageart]").click();
    await active().locator(`[role=option]:has-text("${kind}")`).first().click();
  }
  async function addQuestion(kind, label, options = [], p = admin) {
    await p.click("button[aria-label='Frage hinzufügen']");
    await checkFocusCenter(p, `+ Frage (${kind})`);
    await active().locator("textarea[aria-label=Fragetext]").fill(label);
    if (kind !== "Auswahl") await setKind(kind);
    for (let i = 0; i < options.length; i++) {
      const inputs = active().locator("input[aria-label^='Antwort ']");
      if ((await inputs.count()) <= i) await inputs.nth(i - 1).press("Enter");
      await inputs.nth(i).fill(options[i]);
    }
  }
  // Alle Fragearten
  await addQuestion("Auswahl", "Wer bist du heute?", ["Student:in", "Mentor:in", "Orga / Partner", "Wird entfernt"]);
  await active().locator("button[aria-label='Antwort D entfernen']").click();
  check("optionEntfernt", (await active().locator("input[aria-label^='Antwort ']").count()) === 3);
  await active().locator("[role=switch]:has-text('Pflicht')").click();
  check("pflichtAn", (await active().locator("[role=switch]:has-text('Pflicht')").getAttribute("aria-checked")) === "true");
  // Typwechsel Auswahl → Mehrfachauswahl → Auswahl: Antworten bleiben
  await setKind("Mehrfachauswahl");
  await setKind("Auswahl");
  check("typwechselBehaeltAntworten", (await active().locator("input[aria-label^='Antwort ']").count()) === 3);
  await addQuestion("Sterne", "Wie fandest du den Hackathon?");
  await addQuestion("Stufen", "Was ist vom Hackathon bei dir wirklich hängen geblieben, und kannst du es in deinem eigenen Projekt direkt anwenden?");
  await admin.waitForTimeout(400);
  await admin.screenshot({ path: OUT + "03-editor-stufen.png" });
  await addQuestion("Mehrfachauswahl", "Was hätte es noch besser gemacht?", ["Mehr Zeit", "Mehr Mentoring", "Bessere Räume"]);
  await addQuestion("Ja / Nein", "Würdest du wiederkommen?");
  await addQuestion("Skala", "Wie gut war das Essen?");
  await addQuestion("Text (kurz)", "Ein Wort für den Tag?");
  // Verschieben: Frage 7 nach oben → steht an Position 6
  await active().locator("button[aria-label='Nach oben']").click();
  check("verschieben", (await active().getAttribute("data-question")) === "6");
  await active().locator("button[aria-label='Nach unten']").click();
  // Duplizieren + Löschen (ohne Antworten: kein Dialog, nur Hinweis)
  await active().locator("button[aria-label=Duplizieren]").click();
  await checkFocusCenter(admin, "Duplizieren");
  await active().locator("button[aria-label=Löschen]").click();
  await admin.waitForSelector("text=Frage gelöscht");
  await addQuestion("Text (Absatz)", "Ein Satz an uns?");
  await admin.locator("[data-question='1']").click();
  await admin.waitForTimeout(900);
  await admin.screenshot({ path: OUT + "04-editor.png" });
  await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });

  // Autosave: nach dem Neuladen ist alles da
  await admin.reload();
  await admin.waitForSelector("[data-question='8']");
  checks.fragenNachNeuladen = await admin.locator("[data-question]").count();
  check("autosave8Fragen", checks.fragenNachNeuladen === 8);
  check("titelEditor", (await admin.title()) === `${NAME} bearbeiten · Claus fragt`, await admin.title());
  await admin.screenshot({ path: OUT + "05-editor-neu-geladen.png", fullPage: true });

  // Vorschau von vorne: setzt Screen und Antworten zurück
  await admin.locator("aside button:text-is('3')").click();
  await admin.locator("aside [role=radio]").first().click();
  await admin.click("aside [data-restart]");
  await admin.waitForTimeout(300);
  const vonVorne = (await admin.locator("aside button:text-is('Start')").getAttribute("aria-pressed")) === "true";
  await admin.locator("aside button:text-is('3')").click();
  check("vorschauVonVorne", vonVorne && (await admin.locator("aside [role=radio][aria-checked=true]").count()) === 0);

  // Entwurf-Link: nimmt keine Antworten an
  {
    const p = await page(PHONE, true);
    await p.goto(link);
    await p.waitForSelector("text=Dieser Bogen ist noch nicht live.");
    check("entwurfGesperrt", (await p.locator("text=Los geht's").count()) === 0);
    await p.screenshot({ path: OUT + "10-link-entwurf.png" });
    await p.close();
  }

  // CTA: speichert sofort und öffnet den Teilen-Dialog mit „Live schalten“
  checks.ctaText = (await admin.locator("header [data-cta]").innerText()).trim();
  await admin.locator("main [data-cta]").scrollIntoViewIfNeeded();
  await admin.screenshot({ path: OUT + "05b-editor-cta.png" });
  await admin.click("main [data-cta]");
  await admin.waitForSelector("button:has-text('Live schalten')");
  await admin.screenshot({ path: OUT + "06-teilen-entwurf.png" });
  await admin.click("button:has-text('Live schalten')");
  await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
  await admin.click("button:has-text('Kopieren')").catch(() => {});
  await admin.waitForTimeout(600);
  await admin.screenshot({ path: OUT + "07-teilen-live.png" });
  check("qrPng", ((await admin.locator("a:has-text('QR-Code als PNG')").getAttribute("href")) ?? "").startsWith("data:image/png"));
  const beamerHref = await admin.locator("a:has-text('Vollbild für den Beamer')").getAttribute("href");
  check("teilenZuMeinenBoegen", await admin.locator("[role=dialog] [data-to-list]").isVisible());
  await admin.keyboard.press("Escape");
  check("dialogSchliesstMitEsc", (await admin.locator("[role=dialog]").count()) === 0);
  // Eigener Teilen-Button und „Meine Bögen“ in der mitwandernden Kopfzeile (auch weit unten gescrollt)
  await admin.mouse.wheel(0, 4000);
  await admin.waitForTimeout(300);
  check("kopfzeileMeineBoegenSichtbar", await admin.locator("header [data-header-list]").isVisible());
  await admin.click("header [data-share]");
  await admin.waitForSelector("[role=dialog] [role=radiogroup][aria-label=Status]");
  await admin.screenshot({ path: OUT + "07c-teilen-button.png" });
  await admin.keyboard.press("Escape");
  await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });

  // Beamer-Seite
  {
    const p = await page({ width: 1280, height: 800 });
    await p.goto(BASE + beamerHref);
    await p.waitForSelector(`h1:has-text("${NAME}")`);
    await p.waitForSelector("img[alt^='QR-Code']");
    await p.screenshot({ path: OUT + "07b-beamer.png" });
    await p.close();
  }

  // ======================= Editor am Handy =======================
  {
    const m = await page(PHONE, true);
    await m.goto(`${BASE}/b/${formId}/bearbeiten`);
    await m.waitForSelector("[data-question='3']");
    await m.click("button[aria-label='Frage hinzufügen']");
    await checkFocusCenter(m, "+ Frage (Handy)");
    await m.screenshot({ path: OUT + "08-editor-handy-neu.png" });
    await m.locator("section[aria-label^='Frage '] button[aria-label=Löschen]").click();
    await m.waitForSelector("text=Frage gelöscht");
    await m.locator("[data-question='3']").click();
    await m.waitForTimeout(300);
    await m.screenshot({ path: OUT + "08-editor-handy.png" });
    check("ctaHandy", await m.locator("header [data-cta]").isVisible());
    await m.click("button:text-is('Vorschau')");
    await m.waitForTimeout(900);
    await m.screenshot({ path: OUT + "09-vorschau-handy.png" });
    const ov = m.locator("[role=dialog][aria-label=Vorschau]");
    await ov.locator("button:text-is('1')").click();
    await ov.locator("[role=radio]").first().click();
    await ov.locator("[data-restart]").click();
    await m.waitForTimeout(300);
    const start = (await ov.locator("button:text-is('Start')").getAttribute("aria-pressed")) === "true";
    await ov.locator("button:text-is('1')").click();
    check("vorschauVonVorneHandy", start && (await ov.locator("[role=radio][aria-checked=true]").count()) === 0);
    await m.waitForSelector("[data-save=saved]", { timeout: 10000 });
    await m.close();
  }

  // ======================= Teilnehmende =======================
  async function answerQuestion(p, n) {
    if (await p.locator("textarea").count()) await p.fill("textarea", "Super Orga!");
    else if (await p.locator("input[type=text]").count()) await p.fill("input[type=text]", "Spannend");
    else if (await p.locator("button[role=checkbox]").count()) {
      await p.locator("button[role=checkbox]").nth(0).click();
      await p.locator("button[role=checkbox]").nth(1).click();
    } else {
      const radios = p.locator("button[role=radio]");
      await radios.nth(Math.min(2, (await radios.count()) - 1)).click();
      await p.waitForTimeout(800);
      if (!(await p.locator("button[role=radio][aria-checked=true]").count())) errors.push(`Frage ${n}: Auto-Weiter ausgelöst`);
    }
  }
  /**
   * Bogen am Handy ausfüllen und das Raster messen: y des Haupt-Buttons (data-pill) und der Sprechblase (data-bubble)
   * auf jedem Screen. Erwartung: Abweichung ≤ 1 px.
   * dbl = jeder WEITER!-Tipp als Doppeltipp · failOnce = erstes Speichern der Antworten schlägt fehl (Netz weg).
   */
  async function fillSurvey(viewport, prefix, { shots = false, dbl = false, failOnce = false, expectQuestions = 8 } = {}) {
    const p = await page(viewport, true);
    const rows = [];
    const measure = async (name) => {
      await p.waitForTimeout(900);
      rows.push({ screen: name, button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
      if (shots) await p.screenshot({ path: OUT + `${prefix}-${name}.png` });
    };
    const tap = (sel) => (dbl ? p.dblclick(sel) : p.click(sel));
    await p.goto(link);
    await p.waitForSelector("text=Los geht's");
    await measure("start");
    await tap("text=Los geht's");
    let n = 0;
    let lastText = "";
    for (let guard = 0; guard < 14; guard++) {
      if (guard > 0) await p.waitForFunction((prev) => document.querySelector("[data-bubble]")?.innerText !== prev, lastText);
      if (await p.locator("text=Ergebnis ansehen").count()) break;
      n++;
      await measure(`frage-${n}`);
      if (n > 1 && !(await p.locator("[data-back]").count())) errors.push(`${prefix}: kein Zurück auf Frage ${n}`);
      if (n === 1) {
        await p.click("text=WEITER!");
        checks.pflichtHinweis = await p.locator("text=Bitte beantworte diese Frage.").count();
        rows.push({ screen: "frage-1-hinweis", button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
      }
      await answerQuestion(p, n);
      lastText = await p.locator("[data-bubble]").innerText();
      const isLast = n === expectQuestions;
      if (isLast && failOnce) {
        // Netz weg beim Speichern: verständliche Meldung, Screen bleibt, erneut tippen klappt
        await allowing([/ERR_FAILED|Failed to load resource|Failed to fetch/i], async () => {
          await p.route("**/rest/v1/answers*", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
          await p.click("text=WEITER!");
          await p.waitForSelector("text=Speichern ging nicht.");
          await p.screenshot({ path: OUT + `${prefix}-speicherfehler.png` });
          rows.push({ screen: "speicherfehler", button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
          await p.unroute("**/rest/v1/answers*");
        });
        // langsames Netz + Doppeltipp: trotzdem genau eine Abgabe
        await p.route("**/rest/v1/answers*", async (r) => {
          await new Promise((res) => setTimeout(res, 1200));
          await r.continue();
        });
        await p.dblclick("text=WEITER!");
        checks.speichertAnzeige = await p.locator("[data-pill]:disabled").waitFor({ timeout: 2000 }).then(() => p.locator("[data-pill]").innerText(), (e) => `nicht gesehen: ${e.message.split("\n")[0]}`);
        await p.screenshot({ path: OUT + `${prefix}-speichert.png` });
      } else {
        const before = (await p.locator("img[alt^='Claus']").boundingBox())?.x ?? -1;
        await tap("text=WEITER!");
        if (n === 1 && shots && !dbl) {
          await p.waitForTimeout(330);
          checks.clausWandert = { vorher: Math.round(before), mitten: Math.round((await p.locator("img[alt^='Claus']").boundingBox()).x) };
        }
      }
    }
    await p.waitForSelector("text=Ergebnis ansehen", { timeout: 15000 });
    await p.unroute("**/rest/v1/answers*").catch(() => {});
    if (n !== expectQuestions) errors.push(`${prefix}: ${n} statt ${expectQuestions} Fragen gesehen (Doppeltipp übersprungen?)`);
    await measure("ende");
    if (shots) {
      // Zurück vom Ende: letzte Frage ändern, WEITER! speichert dieselbe Abgabe erneut
      await p.click("[data-back]");
      await p.waitForSelector("textarea");
      await p.fill("textarea", "Super Orga, geändert!");
      await p.waitForTimeout(500); // Doppeltipp-Sperre (400 ms nach Screen-Wechsel)
      await p.click("text=WEITER!");
      await p.waitForSelector("text=Ergebnis ansehen");
      await p.waitForTimeout(900);
      rows.push({ screen: "ende-2", button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
    }
    await tap("text=Ergebnis ansehen");
    await p.waitForSelector("text=So haben alle geantwortet");
    for (let i = 1; i < 15 && !(await p.locator("text=Wir lesen jede Antwort").count()); i++) {
      await measure(`ergebnis-${i}`);
      await p.locator("button:has-text('WEITER!'), button:has-text('Fertig')").first().click();
    }
    await measure("danke");
    if (!(await p.locator("[data-back]").count())) errors.push(`${prefix}: kein Zurück auf Danke`);
    else {
      await p.click("[data-back]");
      await p.waitForSelector("button:has-text('Fertig')");
      await p.waitForTimeout(500);
      await p.click("button:has-text('Fertig')");
      await p.waitForSelector("text=Wir lesen jede Antwort");
    }
    // Abschluss: „Schließen“ → Tschüss-Screen (Raster gleich, Zurück vorhanden)
    await p.waitForTimeout(500);
    await p.click("button:has-text('Schließen')");
    await p.waitForSelector("text=Du kannst dieses Fenster jetzt schließen");
    await measure("tschuess");
    if (!(await p.locator("[data-back]").count())) errors.push(`${prefix}: kein Zurück auf Tschüss`);
    if (shots) await p.screenshot({ path: OUT + "16-tschuess.png" });
    await p.close();
    const spread = (k, filter = () => true) => {
      const ys = rows.filter(filter).map((r) => r[k]).filter((y) => y !== null);
      return Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10;
    };
    const result = {
      viewport: `${viewport.width}×${viewport.height}`,
      screens: rows.length,
      buttonY: [...new Set(rows.map((r) => r.button))],
      bubbleY: [...new Set(rows.map((r) => r.bubble))],
      buttonSpread: spread("button"),
      bubbleSpread: spread("bubble"),
    };
    if (result.buttonSpread > 1) errors.push(`Layout ${result.viewport}: Button springt um ${result.buttonSpread} px`);
    if (result.bubbleSpread > 1) errors.push(`Layout ${result.viewport}: Sprechblase springt um ${result.bubbleSpread} px`);
    return result;
  }

  // Titel + Link-Vorschau des öffentlichen Links
  {
    const p = await page(PHONE, true);
    await p.goto(link);
    await p.waitForSelector("text=Los geht's");
    check("titelLink", (await p.title()) === `${NAME} · Claus fragt`, await p.title());
    check("ogBild", (await p.locator("meta[property='og:image']").count()) > 0);
    // Tastatur: Tab erreicht den Button, Enter startet
    let fokus = false;
    for (let i = 0; i < 4 && !fokus; i++) {
      await p.keyboard.press("Tab");
      fokus = await p.evaluate(() => Boolean(document.activeElement?.hasAttribute("data-pill")));
    }
    check("tastaturFokusButton", fokus);
    await p.close();
  }

  checks.layout = [await fillSurvey(PHONE, "11", { shots: true })];
  ref = { button: checks.layout[0].buttonY[0], bubble: checks.layout[0].bubbleY[0] };
  checks.layout.push(await fillSurvey({ width: 375, height: 667 }, "12-375", { shots: true }));
  checks.layout.push(await fillSurvey({ width: 430, height: 932 }, "13-430", { dbl: true }));
  checks.layout.push(await fillSurvey({ width: 320, height: 640 }, "14-320", { failOnce: true }));
  const abgaben = checks.layout.length;

  // Abgaben zählen: keine doppelte trotz Zurück/Ändern, Doppeltipp und Speicherfehler
  await admin.goto(`${BASE}/b/${formId}/bearbeiten?teilen=1`);
  await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
  checks.abgaben = await admin.locator(".muted:has-text('Antwort')").first().innerText().catch(() => "?");
  check("keineDoppelteAbgabe", checks.abgaben.startsWith(`${abgaben} `), `erwartet ${abgaben}, gesehen: ${checks.abgaben}`);

  // Schließen → Geschlossen-Screen (gleiches Raster) → wieder öffnen
  await admin.click("[role=radio]:has-text('Geschlossen')");
  await admin.waitForTimeout(400);
  await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });
  await admin.keyboard.press("Escape");
  {
    const p = await page(PHONE, true);
    await p.goto(link);
    await p.waitForSelector("text=Diese Umfrage ist beendet.");
    await measureMessage(p, "geschlossen");
    await p.screenshot({ path: OUT + "11-geschlossen.png" });
    await admin.click("header [data-cta]");
    await admin.click("[role=radio]:has-text('Live')");
    await admin.waitForTimeout(400);
    await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });
    await admin.keyboard.press("Escape");
    await p.reload();
    await p.waitForSelector("text=Los geht's");
    check("wiederGeoeffnet", true);
    await p.close();
  }

  // ======================= Ergebnisse =======================
  await admin.goto(`${BASE}/b/${formId}/ergebnisse`);
  await admin.waitForSelector(".kpi");
  await admin.waitForTimeout(500);
  check("titelErgebnisse", (await admin.title()) === `Ergebnisse: ${NAME} · Claus fragt`, await admin.title());
  await admin.screenshot({ path: OUT + "18-ergebnisse.png", fullPage: true });
  kpis = (await admin.locator(".kpi").allInnerTexts()).map((t) => t.replace(/\s+/g, " "));
  // Filter: nur „Orga / Partner“ (alle Testabgaben) → gleiche Anzahl; „Student:in“ → 0
  await admin.click("button[aria-label='Nach Antwort filtern']");
  await admin.click("[role=option]:has-text('Student:in')");
  await admin.waitForSelector("p:has-text('0 Antworten')");
  await admin.screenshot({ path: OUT + "18b-ergebnisse-filter.png" });
  await admin.click("button[aria-label='Nach Antwort filtern']");
  await admin.click("[role=option]:has-text('Alle Antworten')");
  // CSV
  const [download] = await Promise.all([admin.waitForEvent("download"), admin.click("button:has-text('CSV exportieren')")]);
  const csv = fs.readFileSync(await download.path(), "utf8");
  checks.csv = { datei: download.suggestedFilename(), zeilen: csv.trim().split("\n").length };
  check("csvInhalt", csv.includes("frage_nr") && csv.includes("Super Orga, geändert!") && checks.csv.zeilen > abgaben * 7);

  // ======================= Randfälle-Bogen: leer, lange Texte, viele Optionen =======================
  let edgeId, edgeLink;
  {
    await admin.goto(`${BASE}/neu?test=1`);
    await admin.fill("#name", NAME_EDGE);
    await admin.click("[role=radio]:has-text('Lernend')");
    await admin.click("button:has-text('Bogen anlegen')");
    await admin.waitForURL(/\/bearbeiten/);
    edgeId = admin.url().split("/b/")[1].split("/")[0];
    created.add(edgeId);
    // Ergebnisse leer
    await admin.goto(`${BASE}/b/${edgeId}/ergebnisse`);
    await admin.waitForSelector("text=Noch keine Antworten");
    await admin.screenshot({ path: OUT + "17-ergebnisse-leer.png" });
    await admin.goto(`${BASE}/b/${edgeId}/bearbeiten`);
    await admin.waitForSelector("text=Noch keine Fragen");
    const long = "Wenn du an die drei Tage zurückdenkst, an die Workshops, die Gespräche in der Kaffeepause und an das Pitchen am Ende: Welcher Moment hat dich am meisten überrascht und warum?";
    const many = Array.from({ length: 10 }, (_, i) => `Antwortmöglichkeit Nummer ${i + 1} mit einem ziemlich langen Text, der umbrechen muss`);
    await addQuestion("Auswahl", long, many);
    await addQuestion("Skala", "Wie wahrscheinlich empfiehlst du uns weiter?");
    // Auswahl per Tastatur: Pfeiltasten + Enter
    await active().locator("button[aria-label=Von]").click();
    await admin.keyboard.press("ArrowUp");
    await admin.keyboard.press("Enter");
    await active().locator("button[aria-label=Bis]").click();
    for (let i = 0; i < 3; i++) await admin.keyboard.press("ArrowDown");
    await admin.keyboard.press("Enter");
    check("selectTastatur", (await active().locator("button[aria-label=Von]").innerText()).trim() === "0" && (await active().locator("button[aria-label=Bis]").innerText()).trim() === "10");
    await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });
    await admin.click("header [data-cta]");
    await admin.click("button:has-text('Live schalten')");
    await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
    edgeLink = await admin.locator("#share-link").inputValue();
    await admin.keyboard.press("Escape");
    await admin.waitForSelector("[data-save=saved]", { timeout: 10000 });
    for (const vp of [{ width: 375, height: 667 }, PHONE]) {
      const p = await page(vp, true);
      await p.goto(edgeLink);
      await p.click("text=Los geht's");
      await p.waitForTimeout(900);
      const scroll = await p.evaluate(() => {
        const b = document.querySelector("[data-zone=body]");
        return { scrollbar: b.scrollHeight > b.clientHeight, verlauf: b.getAttribute("data-overflow") };
      });
      check(`langeTexte${vp.height}Scrollt`, scroll.scrollbar && scroll.verlauf === "true", JSON.stringify(scroll));
      await p.screenshot({ path: OUT + `15-lang-${vp.width}.png` });
      // letzte Option: Inhaltszone scrollt in sich, Button bleibt stehen
      const pillBefore = await box(p, "[data-pill]");
      await p.locator("button[role=radio]").last().scrollIntoViewIfNeeded();
      await p.locator("button[role=radio]").last().click();
      check(`buttonFest${vp.height}`, Math.abs((await box(p, "[data-pill]")) - pillBefore) <= 1);
      await p.screenshot({ path: OUT + `15-lang-${vp.width}-unten.png` });
      await p.click("text=WEITER!");
      await p.waitForTimeout(900);
      await p.screenshot({ path: OUT + `16-skala-0-10-${vp.width}.png` });
      await p.close();
    }
  }

  // ======================= Bogen duplizieren (Liste mit ?tests=1) =======================
  await admin.goto(`${BASE}/meine-boegen`);
  await admin.waitForSelector("text=Papierkorb");
  check("testbogenAusgeblendet", (await admin.locator(`li[data-form="${NAME}"]`).count()) === 0);
  await admin.goto(`${BASE}/meine-boegen?tests=1`);
  const row = admin.locator(`li[data-form="${NAME}"]`);
  await row.waitFor();
  await admin.screenshot({ path: OUT + "00c-meine-boegen-tests.png" });
  await row.locator("button[aria-label=Duplizieren]").click();
  await admin.waitForURL(/\/bearbeiten/);
  const copyId = admin.url().split("/b/")[1].split("/")[0];
  created.add(copyId);
  await admin.waitForSelector("[data-question='8']");
  check("kopieHatFragen", (await admin.locator("[data-question]").count()) === 8);
  const copyRow = await formRow(copyId);
  check("kopieIstEntwurfUndTest", copyRow?.status === "draft" && copyRow?.settings?.test === true && copyRow?.title === `${NAME} (Kopie)`);

  // ======================= Papierkorb + Wiederherstellen =======================
  await admin.goto(`${BASE}/meine-boegen?tests=1`);
  await row.waitFor();
  await row.locator("button[aria-label=Löschen]").click();
  await admin.waitForSelector("[role=dialog]");
  await admin.waitForTimeout(400);
  await admin.screenshot({ path: OUT + "19-loeschen-dialog.png" });
  await admin.locator("[role=dialog] button:has-text('In den Papierkorb')").click();
  await admin.waitForSelector("text=In den Papierkorb gelegt");
  await admin.screenshot({ path: OUT + "20-papierkorb-toast.png" });
  check("ausListeVerschwunden", (await row.count()) === 0);
  check("softDeleteInDb", Boolean((await formRow(formId))?.settings?.geloescht));
  // Öffentlicher Link + Beamer: „gibt es nicht mehr“
  {
    const p = await page(PHONE, true);
    await p.goto(link);
    await p.waitForSelector("text=Diesen Bogen gibt es nicht mehr.");
    await measureMessage(p, "geloescht");
    await p.screenshot({ path: OUT + "21-link-geloescht.png" });
    await p.goto(BASE + beamerHref);
    await p.waitForSelector("text=Diesen Bogen gibt es nicht mehr.");
    await p.close();
  }
  await admin.click("a:has-text('Papierkorb')");
  await admin.waitForSelector("h1:has-text('Papierkorb')");
  await admin.waitForSelector(`li[data-form="${NAME}"]`);
  await admin.screenshot({ path: OUT + "22-papierkorb.png" });
  await admin.locator(`li[data-form="${NAME}"] button:has-text('Wiederherstellen')`).click();
  await admin.waitForSelector("text=ist wieder da");
  check("wiederhergestellt", !(await formRow(formId))?.settings?.geloescht);
  {
    const p = await page(PHONE, true);
    await p.goto(link);
    await p.waitForSelector("text=Los geht's");
    await p.close();
  }
  // Rückgängig im Toast
  await admin.goto(`${BASE}/meine-boegen?tests=1`);
  await row.waitFor();
  await row.locator("button[aria-label=Löschen]").click();
  await admin.locator("[role=dialog] button:has-text('In den Papierkorb')").click();
  await admin.click("button:has-text('Rückgängig')");
  await admin.waitForSelector("text=ist wieder da");
  await row.waitFor();
  check("rueckgaengig", !(await formRow(formId))?.settings?.geloescht);

  // ======================= Fehler- und Randzustände =======================
  await allowing([/404|Failed to load resource/i], async () => {
    const p = await page(PHONE, true);
    await p.goto(`${BASE}/f/gibtsnicht99`);
    await p.waitForSelector("text=Diesen Bogen gibt es nicht mehr.");
    await measureMessage(p, "falscherSlug");
    await p.goto(`${BASE}/irgendwas/gibt/es/nicht`);
    await p.waitForSelector("text=Hier ist nichts.");
    await measureMessage(p, "404");
    await p.screenshot({ path: OUT + "23-404.png" });
    await p.close();
  });
  await admin.goto(`${BASE}/b/00000000-0000-4000-8000-000000000000/bearbeiten`);
  await admin.waitForSelector("text=Diesen Bogen gibt es nicht.");
  await admin.screenshot({ path: OUT + "24-unbekannte-id.png" });
  await admin.goto(`${BASE}/b/kaputt/ergebnisse`);
  await admin.waitForSelector("text=Diesen Bogen gibt es nicht.");
  await admin.goto(`${BASE}/forms/${formId}/edit`);
  await admin.waitForURL(new RegExp(`/b/${formId}/bearbeiten`));
  await admin.waitForSelector("[data-question='1']");
  await admin.goto(`${BASE}/forms/${formId}/results`);
  await admin.waitForURL(new RegExp(`/b/${formId}/ergebnisse`));
  check("alteLinks", true);
  // Supabase-Fehler im Bogen-Link: „Ich komme gerade nicht durch“ + Nochmal
  await allowing([/ERR_FAILED|Failed to load resource|Failed to fetch/i], async () => {
    const p = await page(PHONE, true);
    await p.route("**/rest/v1/forms*", (r) => r.abort());
    await p.goto(link);
    await p.waitForSelector("text=Ich komme gerade nicht durch.");
    await measureMessage(p, "offline");
    await p.screenshot({ path: OUT + "25-link-offline.png" });
    await p.unroute("**/rest/v1/forms*");
    await p.click("button:has-text('Nochmal')");
    await p.waitForSelector("text=Los geht's");
    await p.close();
  });
} catch (e) {
  errors.push(`Abbruch: ${e.message.split("\n")[0]}`);
  if (admin) await admin.screenshot({ path: OUT + "abbruch.png" }).catch(() => {});
} finally {
  // ---------- Aufräumen: nur eigene Testbögen, exakte id + test-Filter ----------
  if (!KEEP) {
    checks.aufgeraeumt = {};
    for (const id of created) checks.aufgeraeumt[id] = await hardDeleteTestForm(id).catch((e) => `Fehler: ${e.message}`);
    const rest_ = await rest(`forms?select=id,title&settings->>test=eq.true&title=like.*${RUN}*`);
    if (rest_.length) errors.push(`Testbögen übrig: ${JSON.stringify(rest_)}`);
  }
  await browser.close();
}
console.log(JSON.stringify({ base: BASE, link, checks, kpis, errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
