// Test Anmeldung/Abmelden mit nachgestellter Sitzung (Fake-Token im Browser, Datenabfragen laufen wie anonym):
// Konto-Knopf auf allen Admin-Seiten sichtbar, Kopfzeile passt am Handy, Abmelden löscht die Sitzung und führt zu /anmelden.
// DATENSCHUTZ: eigene Testbögen über /neu?test=1, Aufräumen per exakter id + settings.test. Aufruf: node scripts/abmelden-test.mjs [BASE_URL]
import { chromium } from "playwright-core";
const B = process.argv.slice(2).find((a) => a.startsWith("http")) || "http://localhost:3123";
const errors = [];
const check = (n, ok, d = "") => !ok && errors.push(`${n} ${d}`);
const KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600;
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-0000000000aa", email: "test@example.org", exp, role: "authenticated", aud: "authenticated" })}.sig`;
const session = { access_token: jwt, refresh_token: "x", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: "00000000-0000-4000-8000-0000000000aa", email: "test@example.org", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-14T00:00:00Z" } };
const br = await chromium.launch({ channel: "chrome" });
const ids = [];
for (const [name, vp, mobile] of [["handy", { width: 393, height: 852 }, true], ["laptop", { width: 1280, height: 900 }, false]]) {
  const c = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  await c.addInitScript(([s]) => { if (!sessionStorage.getItem("done")) { localStorage.setItem("sb-zsoiiwtcynjwkhdcbkih-auth-token", s); sessionStorage.setItem("done", "1"); } }, [JSON.stringify(session)]);
  // Datenabfragen mit Fake-Token → wie anonym (nur Lesen)
  await c.route("**/rest/v1/**", (r) => { const h = { ...r.request().headers(), authorization: `Bearer ${KEY}` }; r.continue({ headers: h }); });
  const log = [];
  await c.route("**/auth/v1/logout**", async (r) => { log.push("logout-call " + r.request().method()); await r.continue(); });
  const p = await c.newPage();
  p.on("console", (m) => m.type() === "error" && log.push("console: " + m.text().slice(0, 160)));
  p.on("pageerror", (e) => log.push("pageerror: " + e.message));
  await p.goto(B + "/neu?test=1");
  await p.fill("#name", "E2E Logout " + name);
  await p.click("button:has-text('Bogen anlegen')");
  await p.waitForURL(/bearbeiten/);
  const id = p.url().split("/b/")[1].split("/")[0];
  ids.push(id);
  await p.click("button[aria-label='Frage hinzufügen']");
  await p.locator("textarea[aria-label=Fragetext]").fill("Test?");
  await p.locator("button[aria-label=Frageart]").click();
  await p.locator('[role=option]:has-text("Text (kurz)")').first().click();
  await p.locator("[role=switch]:has-text('An der Tafel')").click();
  await p.waitForTimeout(1500);
  for (const path of [`/b/${id}/bearbeiten`, `/b/${id}/ergebnisse`, `/b/${id}/tafel/steuerung`, "/meine-boegen", "/neu"]) {
    await p.goto(B + path);
    await p.waitForSelector("[data-account]", { timeout: 15000 }).catch(() => log.push("kein Konto-Knopf auf " + path));
    await p.waitForTimeout(1200);
    const hdr = await p.evaluate(() => { const h = document.querySelector(".admin-header"); if (!h) return null; return { sw: h.scrollWidth, cw: h.clientWidth, aus: [...h.querySelectorAll("a,button")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < 0); }).map((e) => e.getAttribute("aria-label") || e.textContent.trim()) }; });
    check(`kopfzeilePasst ${name} ${path.replace(id, "ID")}`, hdr && hdr.sw <= hdr.cw && !hdr.aus.length, JSON.stringify(hdr));
    await p.screenshot({ path: `/tmp/logout/${name}${path.replace(id, "").replace(/\//g, "-")}.png` });
  }
  await p.goto(B + `/b/${id}/bearbeiten`);
  await p.waitForSelector("[data-account]");
  await p.click("[data-account]");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/logout/${name}-menue.png` });
  await p.click("[data-logout]");
  await p.waitForTimeout(2500);
  check(`abmelden ${name}`, p.url().includes("/anmelden") && !(await p.evaluate(() => localStorage.getItem("sb-zsoiiwtcynjwkhdcbkih-auth-token"))), p.url());
  log.filter((l) => !/status of 403|sessionStorage/.test(l) && !l.startsWith("logout-call")).forEach((l) => errors.push(l));
  await c.close();
}
// ---------- Passwort: festlegen (Konto-Menü) und Anmelden mit Passwort (Supabase-Antworten nachgestellt) ----------
{
  const c = await br.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await c.route("**/rest/v1/**", (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${KEY}` } }));
  let pwSet = null, pwLogin = null;
  await c.route("**/auth/v1/user**", async (r) => {
    if (r.request().method() === "PUT") pwSet = JSON.parse(r.request().postData() || "{}").password;
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) });
  });
  await c.route("**/auth/v1/token?grant_type=password**", async (r) => {
    pwLogin = JSON.parse(r.request().postData() || "{}");
    if (pwLogin.password !== "richtig-lang-1") return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }) });
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await c.route("**/auth/v1/logout**", (r) => r.fulfill({ status: 204, body: "" }));
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("dialog", (d) => { errors.push("Nativer Dialog"); d.dismiss(); });
  // Anmelden mit Passwort: falsches → verständliche Meldung, richtiges → Meine Bögen
  await p.goto(B + "/anmelden");
  await p.click("[data-mode-passwort]");
  await p.fill("#email", "test@example.org");
  await p.fill("#password", "falsch");
  await p.click("button[type=submit]");
  await p.waitForSelector("#login-error");
  check("falschesPasswortMeldung", (await p.locator("#login-error").innerText()).includes("stimmt nicht"));
  await p.screenshot({ path: ".shots/50-anmelden-passwort-fehler.png" });
  await p.fill("#password", "richtig-lang-1");
  await p.click("button[type=submit]");
  await p.waitForURL(/meine-boegen/, { timeout: 10000 }).catch(() => {});
  check("passwortLogin", p.url().includes("/meine-boegen") && pwLogin?.email === "test@example.org", p.url());
  // Passwort festlegen: zu kurz → Meldung, gut → Toast
  await p.waitForSelector("[data-account]");
  await p.click("[data-account]");
  await p.click("[data-set-password]");
  await p.waitForSelector("[data-password-dialog]");
  await p.fill("#new-password", "kurz");
  await p.click("[data-password-dialog] button[type=submit]");
  await p.waitForSelector("[data-password-dialog] .error");
  await p.screenshot({ path: ".shots/51-passwort-festlegen.png" });
  await p.fill("#new-password", "ein-gutes-passwort");
  await p.click("[data-password-dialog] button[type=submit]");
  await p.waitForSelector("text=Passwort gespeichert");
  check("passwortGesetzt", pwSet === "ein-gutes-passwort" && (await p.locator("[data-password-dialog]").count()) === 0, String(pwSet));
  // Nach dem Abmelden ist „Mit Passwort“ vorausgewählt und die E-Mail ausgefüllt
  await p.click("[data-account]");
  await p.click("[data-logout]");
  await p.waitForURL(/anmelden/);
  await p.waitForTimeout(500);
  check("passwortModusGemerkt", (await p.locator("[data-mode-passwort]").getAttribute("aria-checked")) === "true" && (await p.inputValue("#email")) === "test@example.org");
  await p.screenshot({ path: ".shots/52-anmelden-passwort.png" });
  await c.close();
}
await br.close();
for (const id of ids) { const r = await fetch(`https://zsoiiwtcynjwkhdcbkih.supabase.co/rest/v1/forms?id=eq.${id}&settings->>test=eq.true`, { method: "DELETE", headers: { apikey: KEY, Prefer: "return=representation" } }).then((r) => r.json()); check(`aufgeraeumt ${id}`, r.length === 1); }
console.log(JSON.stringify({ errors: errors.length ? errors : "none" }, null, 1));
process.exit(errors.length ? 1 : 0);
