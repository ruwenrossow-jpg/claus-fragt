"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import styles from "./admin.module.css";

/**
 * Eigene Bestätigungs- und Hinweis-Dialoge statt confirm()/alert(). Überall über useDialog():
 *   if (await dialog.confirm({ title: "Löschen?", danger: true })) …
 *   dialog.toast("Link kopiert")
 */
export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
}

interface DialogApi {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (text: string, tone?: Toast["tone"]) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog braucht <DialogProvider> (app/layout.tsx)");
  return api;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, toast }}>
      {children}
      {pending && (
        <Modal onClose={() => close(false)} label={pending.title} small>
          <h2 className={styles.modalTitle}>{pending.title}</h2>
          {pending.text && <p className={styles.modalText}>{pending.text}</p>}
          <div className={styles.modalActions}>
            <button type="button" className="btn ghost" onClick={() => close(false)}>{pending.cancelLabel ?? "Abbrechen"}</button>
            <button type="button" className={`btn ${pending.danger ? "danger-solid" : "primary"}`} onClick={() => close(true)} autoFocus>
              {pending.confirmLabel ?? "OK"}
            </button>
          </div>
        </Modal>
      )}
      <div className={styles.toasts} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.tone === "error" ? styles.toastError : ""}`} role="status">
            <Icon name={t.tone === "error" ? "alert" : "check"} size={18} />
            {t.text}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

/** Modales Fenster mit Abdunklung; schließt mit Esc und Klick daneben. */
export function Modal({ children, onClose, label, small = false }: { children: React.ReactNode; onClose: () => void; label: string; small?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={`${styles.modal} ${small ? styles.modalSmall : ""}`} role="dialog" aria-modal="true" aria-label={label} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
