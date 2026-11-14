"use client";

import { RefObject, useEffect, useState } from "react";

export interface KeyboardState {
  /** Bildschirmtastatur offen, während ein Textfeld Fokus hat */
  open: boolean;
  /** sichtbare Höhe/Lage über der Tastatur (visualViewport) */
  height: number;
  top: number;
}

const CLOSED: KeyboardState = { open: false, height: 0, top: 0 };
const isTextField = (el: Element | null) => el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && /^(text|search|email|url|tel|number)$/.test(el.type));

/**
 * Erkennt die Bildschirmtastatur am Handy: Ein Textfeld hat Fokus UND der sichtbare Bereich (visualViewport) ist deutlich kleiner
 * als sonst. iOS verkleinert dabei nur den sichtbaren Bereich, nicht die Seite (100dvh bleibt) – ohne diese Erkennung liegt das Feld
 * unter der Tastatur. Am Desktop bleibt open = false.
 * `scope`: nur Textfelder IN diesem Bereich zählen – sonst würde z. B. die (versteckte) Bogen-Vorschau im Editor bei jedem
 * Tippen im Editor die Seite nach oben reißen.
 */
export function useKeyboard(scope: RefObject<HTMLElement | null>): KeyboardState {
  const [state, setState] = useState<KeyboardState>(CLOSED);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let base = vv.height;
    const update = () => {
      base = Math.max(base, vv.height);
      const el = document.activeElement;
      const open = isTextField(el) && Boolean(scope.current?.contains(el)) && vv.height < base - 120;
      setState((s) => (open ? { open, height: Math.round(vv.height), top: Math.round(vv.offsetTop) } : s.open ? CLOSED : s));
      if (open) window.scrollTo(0, 0);
    };
    const reset = () => {
      base = vv.height;
      update();
    };
    // Fokus wechselt vor/nach dem Einblenden der Tastatur: kurz danach nochmal messen
    const onFocus = () => {
      update();
      setTimeout(update, 350);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", reset);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", reset);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
    };
  }, [scope]);
  return state;
}
