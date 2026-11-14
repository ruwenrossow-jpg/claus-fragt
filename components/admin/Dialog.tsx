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

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
  action?: ToastAction;
}

interface DialogApi {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Hinweis unten; optional mit Knopf (z. B. „Rückgängig“), dann bleibt er länger stehen */
  toast: (text: string, tone?: Toast["tone"], action?: ToastAction) => void;
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
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: Toast["tone"] = "ok", action?: ToastAction) => {
      const id = ++nextId.current;
      setToasts((t) => [...t, { id, text, tone, action }]);
      setTimeout(() => dismiss(id), action ? 7000 : tone === "error" ? 5000 : 3200);
    },
    [dismiss]
  );
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
          <div key={t.id} className={`${styles.toast} ${t.tone === "error" ? styles.toastError : ""}`} role={t.tone === "error" ? "alert" : "status"}>
            <Icon name={t.tone === "error" ? "alert" : "check"} size={18} />
            {t.text}
            {t.action && (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  dismiss(t.id);
                  t.action?.onClick();
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Modales Fenster mit Abdunklung; schließt mit Esc und Klick daneben.
 * Tastatur: Fokus springt hinein, Tab bleibt im Fenster, beim Schließen zurück zum auslösenden Element.
 */
export function Modal({ children, onClose, label, small = false }: { children: React.ReactNode; onClose: () => void; label: string; small?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  // vor dem ersten Render merken (autoFocus im Fenster verschiebt den Fokus schon beim Einhängen)
  const [before] = useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!box.current?.contains(document.activeElement)) box.current?.querySelector<HTMLElement>("[autofocus], " + FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab" || !box.current) return;
      const items = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [before]);
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div ref={box} className={`${styles.modal} ${small ? styles.modalSmall : ""}`} role="dialog" aria-modal="true" aria-label={label} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
