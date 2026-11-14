// End-to-End-Test des ganzen Ablaufs mit Screenshots nach .shots/:
// Neuer Bogen → Fragen hinzufügen (Auswahl, Sterne, Stufen, Mehrfach, Ja/Nein, Text) → Autosave + Neuladen →
// Teilen/Live → am Handy ausfüllen (immer mit WEITER!, Claus wandert) → Ergebnis → Ergebnisseite → Löschen über den eigenen Dialog.
// Native Dialoge (confirm/alert/beforeunload) zählen als Fehler.
// Aufruf: node scripts/visual-test.mjs [BASE_URL] [--keep]   (braucht installiertes Google Chrome)
import fs from "fs";
import { chromium } from "playwright-core";

const BASE = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3000";
const OUT = ".shots/";
const NAME = `E2E Builder ${Date.now().toString(36)}`;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const checks = {};
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("response", async (r) => {
    if (r.status() < 400) return;
    const body = await r.text().catch(() => "");
    errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().split("?")[0]} ${body.slice(0, 200)} | Seite: ${p.url()}`);
  });
  p.on("dialog", (d) => {
    errors.push(`Nativer Dialog: ${d.type()} ${d.message()}`);
    d.dismiss();
  });
};
const ctx = (viewport, mobile = false) => browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });

/** Eigenen Testbogen löschen – nur exakt dieser Name (data-form), fremde Bögen werden nie angefasst. */
async function deleteOwnForm(page) {
  await page.goto(`${BASE}/meine-boegen`);
  const row = page.locator(`li[data-form="${NAME}"]`);
  await row.waitFor({ timeout: 10000 });
  await row.locator("button[aria-label=Löschen]").click();
  await page.waitForSelector("[role=dialog]");
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + "19-loeschen-dialog.png" });
  await page.locator("[role=dialog] button:has-text('Löschen')").click();
  await page.waitForSelector("text=Bogen gelöscht");
  await page.screenshot({ path: OUT + "20-geloescht.png" });
  return (await row.count()) === 0;
}

let admin, link, kpis;
try {
// ---------- Ersteller:in (Desktop) ----------
admin = await (await ctx({ width: 1280, height: 900 })).newPage();
watch(admin);
await admin.goto(`${BASE}/neu`);
await admin.waitForSelector("text=Was für ein Event ist es?");
await admin.click("button:has-text('Bogen anlegen')"); // ohne Namen → eigene Meldung statt Browser-Blase
await admin.waitForSelector("text=Bitte gib dem Bogen einen Namen.");
await admin.fill("#name", NAME);
await admin.fill("#beschreibung", "Danke, dass du dabei warst! Sag uns kurz, wie es war.");
await admin.click("[role=radio]:has-text('Inspirierend')");
await admin.screenshot({ path: OUT + "01-neu.png" });
await admin.click("button:has-text('Bogen anlegen')");
await admin.waitForURL(/\/bearbeiten/);
await admin.waitForSelector("text=Noch keine Fragen");
await admin.screenshot({ path: OUT + "02-editor-leer.png" });

const active = () => admin.locator("section[aria-label^='Frage ']");
/** Nach „+ Frage“/„Duplizieren“: Cursor im Fragetext der neuen Karte, Karte etwa in der Bildschirmmitte. */
async function checkFocusCenter(page, what) {
  await page.waitForTimeout(800); // sanftes Scrollen abwarten
  const r = await page.evaluate(() => {
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
  const mittig = Math.abs(r.abstandZurMitte) < r.hoehe * 0.15 || r.ganzUnten || r.ganzOben; // am Seitenende geht Mitte nicht
  if (!r.fokus) errors.push(`${what}: Fokus nicht im Fragetext`);
  if (!mittig) errors.push(`${what}: Karte nicht mittig (${r.abstandZurMitte} px daneben)`);
  (checks.fokusMitte ??= []).push({ what, ...r });
}
async function addQuestion(kind, label, options = []) {
  await admin.click("button[aria-label='Frage hinzufügen']");
  await checkFocusCenter(admin, `+ Frage (${kind})`);
  await active().locator("textarea[aria-label=Fragetext]").fill(label);
  if (kind !== "Auswahl") {
    await active().locator("button[aria-label=Frageart]").click();
    await active().locator(`[role=option]:has-text("${kind}")`).first().click();
  }
  for (let i = 0; i < options.length; i++) {
    const inputs = active().locator("input[aria-label^='Antwort ']");
    if ((await inputs.count()) <= i) await inputs.nth(i - 1).press("Enter"); // Enter legt die nächste Antwort an
    await inputs.nth(i).fill(options[i]);
  }
}
await addQuestion("Auswahl", "Wer bist du heute?", ["Student:in", "Mentor:in", "Orga / Partner"]);
await active().locator("[role=switch]:has-text('Pflicht')").click();
await addQuestion("Sterne", "Wie fandest du den Hackathon?");
await addQuestion("Stufen", "Was ist vom Hackathon bei dir wirklich hängen geblieben, und kannst du es in deinem eigenen Projekt direkt anwenden?");
await admin.waitForTimeout(400);
await admin.screenshot({ path: OUT + "03-editor-stufen.png" });
await addQuestion("Mehrfachauswahl", "Was hätte es noch besser gemacht?", ["Mehr Zeit", "Mehr Mentoring", "Bessere Räume"]);
await addQuestion("Ja / Nein", "Würdest du wiederkommen?");
// Duplizieren + Löschen (ohne Antworten: kein Dialog, nur Hinweis)
await active().locator("button[aria-label=Duplizieren]").click();
await checkFocusCenter(admin, "Duplizieren");
await active().locator("button[aria-label=Löschen]").click();
await admin.waitForSelector("text=Frage gelöscht");
await addQuestion("Text (Absatz)", "Ein Satz an uns?");
await admin.locator("[data-question='1']").click(); // aktive Karte wechseln → Vorschau springt mit
await admin.waitForTimeout(900);
await admin.screenshot({ path: OUT + "04-editor.png" });
await admin.waitForSelector("text=Gespeichert", { timeout: 10000 });

// Autosave: nach dem Neuladen ist alles da
await admin.reload();
await admin.waitForSelector("[data-question='6']");
checks.fragenNachNeuladen = await admin.locator("[data-question]").count();
await admin.screenshot({ path: OUT + "05-editor-neu-geladen.png", fullPage: true });

// Vorschau von vorne: setzt Screen und Antworten zurück
await admin.locator("aside button:text-is('3')").click();
await admin.locator("aside [role=radio]").first().click();
await admin.click("aside [data-restart]");
await admin.waitForTimeout(300);
checks.vorschauVonVorne = (await admin.locator("aside button:text-is('Start')").getAttribute("aria-pressed")) === "true";
await admin.locator("aside button:text-is('3')").click();
checks.vorschauAntwortenLeer = (await admin.locator("aside [role=radio][aria-checked=true]").count()) === 0;
if (!checks.vorschauVonVorne || !checks.vorschauAntwortenLeer) errors.push("Vorschau von vorne setzt nicht zurück");

// CTA am Ende der Fragenliste: speichert sofort und öffnet den Teilen-Dialog mit „Live schalten“
checks.ctaText = (await admin.locator("header [data-cta]").innerText()).trim();
await admin.locator("main [data-cta]").scrollIntoViewIfNeeded();
await admin.screenshot({ path: OUT + "05b-editor-cta.png" });
await admin.click("main [data-cta]");
await admin.waitForSelector("button:has-text('Live schalten')");
checks.ctaGespeichert = (await admin.locator("text=Gespeichert").count()) > 0;
await admin.keyboard.press("Escape");
await admin.click("header [data-cta]"); // Speichern & abschließen (Kopfzeile)
await admin.waitForSelector("button:has-text('Live schalten')");
await admin.screenshot({ path: OUT + "06-teilen-entwurf.png" });
await admin.click("button:has-text('Live schalten')");
await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
await admin.click("button:has-text('Kopieren')").catch(() => {}); // Zwischenablage evtl. gesperrt → eigener Hinweis
await admin.waitForTimeout(600);
await admin.screenshot({ path: OUT + "07-teilen-live.png" });
link = await admin.locator("#share-link").inputValue();
await admin.keyboard.press("Escape");
await admin.waitForSelector("text=Gespeichert", { timeout: 10000 });
const formId = admin.url().split("/b/")[1].split("/")[0];

// ---------- Editor am Handy ----------
const mobileAdmin = await (await ctx({ width: 393, height: 852 }, true)).newPage();
watch(mobileAdmin);
await mobileAdmin.goto(`${BASE}/b/${formId}/bearbeiten`);
await mobileAdmin.waitForSelector("[data-question='3']");
await mobileAdmin.click("button[aria-label='Frage hinzufügen']");
await checkFocusCenter(mobileAdmin, "+ Frage (Handy)");
await mobileAdmin.screenshot({ path: OUT + "08-editor-handy-neu.png" });
await mobileAdmin.locator("section[aria-label^='Frage '] button[aria-label=Löschen]").click();
await mobileAdmin.waitForSelector("text=Frage gelöscht");
await mobileAdmin.locator("[data-question='3']").click();
await mobileAdmin.waitForTimeout(300);
await mobileAdmin.screenshot({ path: OUT + "08-editor-handy.png" });
checks.ctaHandy = await mobileAdmin.locator("header [data-cta]").isVisible();
await mobileAdmin.click("button:text-is('Vorschau')");
await mobileAdmin.waitForTimeout(900);
await mobileAdmin.screenshot({ path: OUT + "09-vorschau-handy.png" });
// Von vorne (mobile Vorschau): Screen und Antworten zurück
const ov = mobileAdmin.locator("[role=dialog][aria-label=Vorschau]");
await ov.locator("button:text-is('1')").click();
await ov.locator("[role=radio]").first().click();
await ov.locator("[data-restart]").click();
await mobileAdmin.waitForTimeout(300);
checks.vorschauVonVorneHandy = (await ov.locator("button:text-is('Start')").getAttribute("aria-pressed")) === "true";
await ov.locator("button:text-is('1')").click();
if (!checks.vorschauVonVorneHandy || (await ov.locator("[role=radio][aria-checked=true]").count())) errors.push("Vorschau von vorne (Handy) setzt nicht zurück");
await mobileAdmin.close();

// ---------- Teilnehmende:r (Handy): ausfüllen + Layout-Raster messen ----------
// Auf jedem Screen: y des Haupt-Buttons (data-pill) und Oberkante der Sprechblase (data-bubble).
// Erwartung: Button überall gleich (≤ 1 px), Blase auf allen Screens an derselben Stelle (≤ 1 px).
const box = async (p, sel) => {
  const b = await p.locator(sel).first().boundingBox();
  return b ? Math.round(b.y * 10) / 10 : null;
};
async function answerQuestion(p, n) {
  if (await p.locator("textarea").count()) await p.fill("textarea", "Super Orga!");
  else if (await p.locator("button[role=checkbox]").count()) {
    await p.locator("button[role=checkbox]").nth(0).click();
    await p.locator("button[role=checkbox]").nth(1).click();
  } else {
    const radios = p.locator("button[role=radio]");
    await radios.nth(Math.min(2, (await radios.count()) - 1)).click();
    await p.waitForTimeout(800);
    // kein Auto-Weiter: wir sind noch auf derselben Frage
    if (!(await p.locator("button[role=radio][aria-checked=true]").count())) errors.push(`Frage ${n}: Auto-Weiter ausgelöst`);
  }
}
async function fillSurvey(viewport, prefix, { shots = false } = {}) {
  const p = await (await ctx(viewport, true)).newPage();
  watch(p);
  const rows = [];
  const measure = async (name) => {
    await p.waitForTimeout(900); // Claus-Wanderung + Schriftanpassung abwarten
    rows.push({ screen: name, button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
    if (shots) await p.screenshot({ path: OUT + `${prefix}-${name}.png` });
  };
  await p.goto(link);
  await p.waitForSelector("text=Los geht's");
  await measure("start");
  await p.click("text=Los geht's");
  let n = 0;
  const bubbleText = () => p.locator("[data-bubble]").innerText();
  let lastText = "";
  for (let guard = 0; guard < 12; guard++) {
    // warten, bis der nächste Screen da ist (Sprechblase zeigt neuen Text) – Speichern kann dauern
    if (guard > 0) await p.waitForFunction((prev) => document.querySelector("[data-bubble]")?.innerText !== prev, lastText);
    if (await p.locator("text=Ergebnis ansehen").count()) break;
    n++;
    await measure(`frage-${n}`);
    if (n === 1) {
      await p.click("text=WEITER!"); // Pflicht ohne Antwort → Hinweis über dem Button, Button bleibt stehen
      checks.pflichtHinweis = await p.locator("text=Bitte beantworte diese Frage.").count();
      rows.push({ screen: "frage-1-hinweis", button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
    }
    await answerQuestion(p, n);
    lastText = await bubbleText();
    const before = (await p.locator("img[alt^='Claus']").boundingBox())?.x ?? -1;
    await p.click("text=WEITER!");
    if (n === 1 && shots) {
      await p.waitForTimeout(330);
      checks.clausWandert = { vorher: Math.round(before), mitten: Math.round((await p.locator("img[alt^='Claus']").boundingBox()).x) };
      await p.screenshot({ path: OUT + `${prefix}-claus-unterwegs.png` });
    }
  }
  await p.waitForSelector("text=Ergebnis ansehen");
  await measure("ende");
  if (shots) {
    // Zurück vom Ende: letzte Frage ändern, WEITER! speichert dieselbe Abgabe erneut (keine doppelte)
    if (!(await p.locator("button:has-text('Zurück')").count())) errors.push(`${prefix}: kein Zurück auf Ende`);
    await p.click("button:has-text('Zurück')");
    await p.waitForSelector("textarea");
    await p.fill("textarea", "Super Orga, geändert!");
    await p.click("text=WEITER!");
    await p.waitForSelector("text=Ergebnis ansehen");
    await p.waitForTimeout(900);
    rows.push({ screen: "ende-2", button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") });
  }
  await p.click("text=Ergebnis ansehen");
  await p.waitForSelector("text=So haben alle geantwortet");
  for (let i = 1; i < 15 && !(await p.locator("text=Wir lesen jede Antwort").count()); i++) {
    await measure(`ergebnis-${i}`);
    await p.locator("button:has-text('WEITER!'), button:has-text('Fertig')").first().click();
  }
  await measure("danke");
  // Zurück auf Danke → letztes Ergebnis, Fertig → wieder Danke
  if (!(await p.locator("button:has-text('Zurück')").count())) errors.push(`${prefix}: kein Zurück auf Danke`);
  else {
    await p.click("button:has-text('Zurück')");
    await p.waitForSelector("button:has-text('Fertig')");
    checks.zurueckVonDanke = true;
    await p.click("button:has-text('Fertig')");
    await p.waitForSelector("text=Wir lesen jede Antwort");
  }
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
    bubbleSpreadFragen: spread("bubble", (r) => r.screen.startsWith("frage")),
  };
  if (result.buttonSpread > 1) errors.push(`Layout ${result.viewport}: Button springt um ${result.buttonSpread} px`);
  if (result.bubbleSpread > 1) errors.push(`Layout ${result.viewport}: Sprechblase springt um ${result.bubbleSpread} px`);
  return result;
}
checks.layout = [await fillSurvey({ width: 393, height: 852 }, "11", { shots: true })];
checks.layout.push(await fillSurvey({ width: 375, height: 667 }, "12-375", { shots: true }));
checks.layout.push(await fillSurvey({ width: 430, height: 932 }, "13-430", { shots: true }));
checks.layout.push(await fillSurvey({ width: 320, height: 640 }, "14-320", { shots: true }));

// Geschlossen-Screen: gleiche Position von Button-Platz und Blase wie die übrigen Screens
await admin.goto(`${BASE}/b/${formId}/bearbeiten?teilen=1`);
await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
checks.abgaben = await admin.locator(".muted:has-text('Antwort')").first().innerText().catch(() => "?");
if (!checks.abgaben.startsWith(`${checks.layout.length} `)) errors.push(`Doppelte Abgabe? Erwartet ${checks.layout.length} Antworten, gesehen: ${checks.abgaben}`);
await admin.click("[role=radio]:has-text('Geschlossen')");
await admin.waitForTimeout(400);
await admin.keyboard.press("Escape");
await admin.waitForSelector("text=Gespeichert", { timeout: 10000 });
{
  const p = await (await ctx({ width: 393, height: 852 }, true)).newPage();
  watch(p);
  await p.goto(link);
  await p.waitForSelector("text=Diese Umfrage ist beendet.");
  await p.waitForTimeout(900);
  const closed = { button: await box(p, "[data-pill]"), bubble: await box(p, "[data-bubble]") };
  await p.screenshot({ path: OUT + "11-geschlossen.png" });
  checks.geschlossen = closed;
  const ref = checks.layout[0];
  if (Math.abs(closed.button - ref.buttonY[0]) > 1 || Math.abs(closed.bubble - ref.bubbleY[0]) > 1) errors.push(`Geschlossen-Screen weicht ab: ${JSON.stringify(closed)}`);
  await p.close();
}

// ---------- Ergebnisseite ----------
await admin.goto(`${BASE}/b/${formId}/ergebnisse`);
await admin.waitForSelector(".kpi");
await admin.waitForTimeout(500);
await admin.screenshot({ path: OUT + "18-ergebnisse.png", fullPage: true });
kpis = (await admin.locator(".kpi").allInnerTexts()).map((t) => t.replace(/\s+/g, " "));

} catch (e) {
  // Abbruch: eigenen Testbogen trotzdem aufräumen, dann Fehler melden
  if (admin && !process.argv.includes("--keep")) await deleteOwnForm(admin).catch(() => {});
  await browser.close();
  throw e;
}
// ---------- Löschen über den eigenen Dialog ----------
if (!process.argv.includes("--keep")) checks.geloescht = await deleteOwnForm(admin);
console.log(JSON.stringify({ link, checks, kpis, errors: errors.length ? errors : "none" }, null, 1));
await browser.close();
