"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { Icon } from "@/components/admin/icons";
import styles from "@/components/admin/admin.module.css";
import b from "@/components/builder/builder.module.css";
import { sendLoginLink, signInWithPassword, useSession } from "@/lib/auth";

/** Nur eigene Seiten als Ziel (kein Weiterleiten auf fremde Adressen). */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/meine-boegen");

/**
 * Anmelden: mit Passwort (sofort, ohne Mail) oder per E-Mail-Link (erstes Mal / Passwort vergessen).
 * Supabase verschickt ohne eigenen Mail-Versand nur wenige Mails pro Stunde – daher Passwort als Standard, sobald eins gesetzt ist.
 * Das Passwort legt man angemeldet im Konto-Menü fest.
 */
type Mode = "passwort" | "link";
const MODE_KEY = "claus-login-mode";
function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("weiter"));
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [mode, setModeState] = useState<Mode>("link");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "passwort" || saved === "link") setModeState(saved);
      setEmail(localStorage.getItem("claus-login-email") ?? "");
    } catch {}
  }, []);
  const setMode = (m: Mode) => {
    setModeState(m);
    setError(null);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Angemeldet (auch direkt nach dem Klick auf den Link) → weiter
  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Bitte gib deine E-Mail-Adresse ein.");
      input.current?.focus();
      return;
    }
    if (mode === "passwort" && !password) {
      setError("Bitte gib dein Passwort ein.");
      return;
    }
    setError(null);
    setState("busy");
    try {
      localStorage.setItem("claus-login-email", email.trim());
    } catch {}
    try {
      if (mode === "passwort") {
        await signInWithPassword(email, password);
        setState("idle"); // Sitzung da → useEffect leitet weiter
        return;
      }
      await sendLoginLink(email, next);
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="admin-main admin-narrow">
        <div className={`panel ${styles.login}`}>
          <img src={getTheme(null).mascot.happy} alt="" width={440} height={440} className={styles.loginMascot} />
          {session ? (
            <p role="status">Du bist angemeldet – einen Moment …</p>
          ) : state === "sent" ? (
            <div role="status" data-login-sent>
              <h2>Schau in dein Postfach</h2>
              <p>Wir haben dir einen Link an <strong>{email.trim()}</strong> geschickt. Öffne ihn auf dem Gerät, auf dem du arbeiten willst – Laptop, Tablet oder Handy.</p>
              <p className="muted">Nichts da? Schau im Spam-Ordner nach oder schick den Link nochmal.</p>
              <button type="button" className="btn" onClick={() => setState("idle")}>Nochmal schicken</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2>Anmelden</h2>
              <div className={b.segmented} role="radiogroup" aria-label="Anmelden mit" style={{ marginBottom: 14 }}>
                <button type="button" role="radio" aria-checked={mode === "passwort"} className={b.segment} onClick={() => setMode("passwort")} data-mode-passwort>Mit Passwort</button>
                <button type="button" role="radio" aria-checked={mode === "link"} className={b.segment} onClick={() => setMode("link")} data-mode-link>Link per Mail</button>
              </div>
              <p>
                {mode === "passwort"
                  ? "Sofort drin, ohne Mail. Das Passwort legst du einmal im Konto-Menü fest (oben rechts, nach der Anmeldung per Link)."
                  : "Du bekommst einen Link per Mail – gut fürs erste Mal oder wenn du das Passwort vergessen hast."}
              </p>
              <label className="field-label" htmlFor="email">E-Mail</label>
              <input ref={input} id="email" type="email" inputMode="email" autoComplete={mode === "passwort" ? "username" : "email"} value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="name@beispiel.de" aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
              {mode === "passwort" && (
                <>
                  <label className="field-label" htmlFor="password">Passwort</label>
                  <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPw(e.target.value); setError(null); }} />
                </>
              )}
              {error && <p id="login-error" className="error" role="alert">{error}</p>}
              <button type="submit" className="btn primary big wide" disabled={state === "busy"} style={{ marginTop: 16 }}>
                {mode === "passwort" ? (
                  <><Icon name="check" size={18} /> {state === "busy" ? "Melde an …" : "Anmelden"}</>
                ) : (
                  <><Icon name="mail" size={18} /> {state === "busy" ? "Schicke …" : "Link schicken"}</>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
