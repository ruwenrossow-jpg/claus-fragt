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
  p.on("dialog", (d) => {
    errors.push(`Nativer Dialog: ${d.type()} ${d.message()}`);
    d.dismiss();
  });
};
const ctx = (viewport, mobile = false) => browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });

// ---------- Ersteller:in (Desktop) ----------
const admin = await (await ctx({ width: 1280, height: 900 })).newPage();
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
async function addQuestion(kind, label, options = []) {
  await admin.click("button[aria-label='Frage hinzufügen']");
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

await admin.click("header button:has-text('Teilen')");
await admin.waitForSelector("button:has-text('Live schalten')");
await admin.screenshot({ path: OUT + "06-teilen-entwurf.png" });
await admin.click("button:has-text('Live schalten')");
await admin.waitForSelector("[role=radiogroup][aria-label=Status]");
await admin.click("button:has-text('Kopieren')").catch(() => {}); // Zwischenablage evtl. gesperrt → eigener Hinweis
await admin.waitForTimeout(600);
await admin.screenshot({ path: OUT + "07-teilen-live.png" });
const link = await admin.locator("#share-link").inputValue();
await admin.keyboard.press("Escape");
await admin.waitForSelector("text=Gespeichert", { timeout: 10000 });
const formId = admin.url().split("/b/")[1].split("/")[0];

// ---------- Editor am Handy ----------
const mobileAdmin = await (await ctx({ width: 393, height: 852 }, true)).newPage();
watch(mobileAdmin);
await mobileAdmin.goto(`${BASE}/b/${formId}/bearbeiten`);
await mobileAdmin.waitForSelector("[data-question='3']");
await mobileAdmin.locator("[data-question='3']").click();
await mobileAdmin.waitForTimeout(300);
await mobileAdmin.screenshot({ path: OUT + "08-editor-handy.png" });
await mobileAdmin.click("button:has-text('Vorschau')");
await mobileAdmin.waitForTimeout(900);
await mobileAdmin.screenshot({ path: OUT + "09-vorschau-handy.png" });
await mobileAdmin.close();

// ---------- Teilnehmende:r (Handy) ----------
const phone = await (await ctx({ width: 393, height: 852 }, true)).newPage();
watch(phone);
await phone.goto(link);
await phone.waitForSelector("text=Los geht's");
await phone.waitForTimeout(500);
await phone.screenshot({ path: OUT + "10-start.png" });
await phone.click("text=Los geht's");

const mascotX = async () => (await phone.locator("img[alt^='Claus']").boundingBox())?.x ?? -1;
let n = 0;
for (let guard = 0; guard < 12; guard++) {
  await phone.waitForTimeout(900);
  if (await phone.locator("text=Ergebnis ansehen").count()) break;
  n++;
  await phone.screenshot({ path: OUT + `11-frage-${n}.png` });
  if (n === 1) {
    await phone.click("text=WEITER!"); // Pflicht ohne Antwort → Hinweis
    checks.pflichtHinweis = await phone.locator("text=Bitte beantworte diese Frage.").count();
  }
  if (await phone.locator("textarea").count()) await phone.fill("textarea", "Super Orga!");
  else if (await phone.locator("button[role=checkbox]").count()) {
    await phone.locator("button[role=checkbox]").nth(0).click();
    await phone.locator("button[role=checkbox]").nth(1).click();
  } else {
    const radios = phone.locator("button[role=radio]");
    await radios.nth(Math.min(2, (await radios.count()) - 1)).click();
    await phone.waitForTimeout(800);
    // kein Auto-Weiter: wir sind noch auf derselben Frage
    if (!(await phone.locator("button[role=radio][aria-checked=true]").count())) errors.push(`Frage ${n}: Auto-Weiter ausgelöst`);
  }
  const before = await mascotX();
  await phone.click("text=WEITER!");
  if (n === 1) {
    await phone.waitForTimeout(330);
    checks.clausWandert = { vorher: Math.round(before), mitten: Math.round(await mascotX()) };
    await phone.screenshot({ path: OUT + "12-claus-unterwegs.png" });
    await phone.waitForTimeout(600);
    checks.clausWandert.nachher = Math.round(await mascotX());
  }
}
await phone.waitForSelector("text=Ergebnis ansehen");
await phone.screenshot({ path: OUT + "13-ende.png" });
await phone.click("text=Ergebnis ansehen");
await phone.waitForSelector("text=So haben die anderen geantwortet");
await phone.waitForTimeout(600);
await phone.screenshot({ path: OUT + "14-ergebnis.png" });
for (let i = 0; i < 15 && !(await phone.locator("text=Wir lesen jede Antwort").count()); i++) {
  await phone.locator("button:has-text('WEITER!'), button:has-text('Fertig')").first().click();
  await phone.waitForTimeout(250);
}
await phone.screenshot({ path: OUT + "15-danke.png" });

// ---------- Sprechblase auf schmalem Handy (320 px): kurze und lange Frage ----------
const narrow = await (await ctx({ width: 320, height: 640 }, true)).newPage();
watch(narrow);
await narrow.goto(link);
await narrow.click("text=Los geht's");
await narrow.waitForTimeout(800);
await narrow.screenshot({ path: OUT + "16-schmal-kurz.png" });
await narrow.locator("button[role=radio]").first().click();
await narrow.click("text=WEITER!");
await narrow.waitForTimeout(800);
await narrow.locator("button[role=radio]").nth(3).click();
await narrow.click("text=WEITER!");
await narrow.waitForTimeout(900);
await narrow.screenshot({ path: OUT + "17-schmal-lang.png", fullPage: true });

// ---------- Ergebnisseite ----------
await admin.goto(`${BASE}/b/${formId}/ergebnisse`);
await admin.waitForSelector(".kpi");
await admin.waitForTimeout(500);
await admin.screenshot({ path: OUT + "18-ergebnisse.png", fullPage: true });
const kpis = (await admin.locator(".kpi").allInnerTexts()).map((t) => t.replace(/\s+/g, " "));

// ---------- Löschen über den eigenen Dialog ----------
if (!process.argv.includes("--keep")) {
  await admin.goto(`${BASE}/meine-boegen`);
  const row = admin.locator(`li[data-form="${NAME}"]`);
  await row.locator("button[aria-label=Löschen]").click();
  await admin.waitForSelector("[role=dialog]");
  await admin.waitForTimeout(400);
  await admin.screenshot({ path: OUT + "19-loeschen-dialog.png" });
  await admin.locator("[role=dialog] button:has-text('Löschen')").click();
  await admin.waitForSelector("text=Bogen gelöscht");
  await admin.screenshot({ path: OUT + "20-geloescht.png" });
  checks.geloescht = (await row.count()) === 0;
}
console.log(JSON.stringify({ link, checks, kpis, errors: errors.length ? errors : "none" }, null, 1));
await browser.close();
