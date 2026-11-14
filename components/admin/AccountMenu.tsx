"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD, setPassword, signOut, useSession } from "@/lib/auth";
import { useDialog } from "./Dialog";
import { Icon } from "./icons";
import styles from "./admin.module.css";

/**
 * Konto-Knopf in der Kopfzeile: öffnet ein kleines Menü mit „Angemeldet als …“, optionalen Seiten-Links
 * (`menu`, nur am Handy – dort ist in der Kopfzeile kein Platz) und „Abmelden“.
 */
export function AccountMenu({ menu }: { menu?: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const email = session?.user.email;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!email) return null;
  return (
    <div ref={box} className={styles.account}>
      <button type="button" className="btn ghost" aria-label="Konto" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-account>
        <Icon name="user" size={18} /> <span className="hide-mobile">Konto</span>
      </button>
      {open && (
        <div className={styles.accountPop} role="menu" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          <p className={styles.accountWho}>
            Angemeldet als<strong>{email}</strong>
          </p>
          {menu && <div className={styles.accountMobile}>{menu}</div>}
          <button type="button" className={styles.accountItem} role="menuitem" data-set-password onClick={() => { setOpen(false); setPwOpen(true); }}>
            <Icon name="key" size={18} /> Passwort festlegen
          </button>
          <button
            type="button"
            className={styles.accountItem}
            role="menuitem"
            disabled={busy}
            data-logout
            onClick={async () => {
              setBusy(true);
              await signOut();
              setOpen(false);
              setBusy(false);
              router.replace("/anmelden");
            }}
          >
            <Icon name="logout" size={18} /> {busy ? "Melde ab …" : "Abmelden"}
          </button>
        </div>
      )}
      {pwOpen && <PasswordDialog email={email} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

/** Passwort festlegen/ändern – danach geht die Anmeldung ohne Mail (kein Mail-Limit). */
function PasswordDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const dialog = useDialog();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setPassword(pw);
      try {
        localStorage.setItem("claus-login-mode", "passwort");
        localStorage.setItem("claus-login-email", email);
      } catch {}
      onClose();
      dialog.toast("Passwort gespeichert – ab jetzt geht die Anmeldung ohne Mail");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`${styles.modal} ${styles.modalSmall} panel`} role="dialog" aria-modal="true" aria-labelledby="pw-title" onSubmit={save} noValidate data-password-dialog>
        <h2 id="pw-title" className={styles.modalTitle}>Passwort festlegen</h2>
        <p className={styles.modalText}>Damit meldest du dich künftig sofort an, ohne auf eine Mail zu warten. Mindestens {MIN_PASSWORD} Zeichen.</p>
        {/* für Passwort-Manager: zu welchem Konto gehört das Passwort */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label className="field-label" htmlFor="new-password">Neues Passwort</label>
        <input ref={field} id="new-password" type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setError(null); }} aria-invalid={Boolean(error)} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
        </div>
      </form>
    </div>
  );
}
