"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { Icon } from "@/components/admin/icons";
import styles from "@/components/admin/admin.module.css";
import { sendLoginLink, useSession } from "@/lib/auth";

/** Nur eigene Seiten als Ziel (kein Weiterleiten auf fremde Adressen). */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/meine-boegen");

/** Anmelden per E-Mail-Link: Adresse eingeben → Link in der Mail öffnen (auf jedem Gerät) → angemeldet, zurück zur gewünschten Seite. */
function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("weiter"));
  const session = useSession();
  const [email, setEmail] = useState("");
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
    setError(null);
    setState("busy");
    try {
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
              <p>Mit deiner E-Mail kommst du auf jedem Gerät an deine Bögen. Kein Passwort – du bekommst einen Link.</p>
              <label className="field-label" htmlFor="email">E-Mail</label>
              <input ref={input} id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="name@beispiel.de" aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
              {error && <p id="login-error" className="error" role="alert">{error}</p>}
              <button type="submit" className="btn primary big wide" disabled={state === "busy"} style={{ marginTop: 16 }}>
                <Icon name="mail" size={18} /> {state === "busy" ? "Schicke …" : "Link schicken"}
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
