"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth";
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
    </div>
  );
}
