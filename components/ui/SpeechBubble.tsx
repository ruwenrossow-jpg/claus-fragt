"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTween } from "./useTween";
import styles from "./ui.module.css";

interface Props {
  /** Spitze des Zipfels (zeigt nach oben zu Claus), waagerecht: 0 = linker Rand, 1 = rechter Rand. Wird animiert. */
  tailX: number;
  children: string;
  help?: string | null;
}

const SQRT2 = Math.SQRT2;
/** Schriftgrößen-Stufen (--bubble-font-1 … -7): die größte, bei der der Text ins einbeschriebene Rechteck passt, gewinnt. */
const FONT_STEPS = 7;

/**
 * Ovale Sprechblase mit Zipfel nach oben. Größe kommt aus dem Layout-Raster (volle Breite, feste Höhe --bubble-h),
 * damit sie auf jedem Screen an derselben Stelle im gleichen Verhältnis steht. Der Text ist vertikal zentriert und
 * wird schrittweise kleiner, bis er in das einbeschriebene Rechteck der Ellipse (Breite/√2 × Höhe/√2) passt.
 * Ellipse und Zipfel sind EIN SVG-Pfad – der Übergang ist immer nahtlos.
 */
export function SpeechBubble({ tailX, children, help }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, tail: 0 });
  const [fit, setFit] = useState({ key: "", step: 0 });
  const x = useTween(tailX);

  // Größe der Blase aus dem Raster lesen (offsetWidth/-Height ignorieren CSS-zoom im Handy-Rahmen)
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const next = { w: el.offsetWidth, h: el.offsetHeight, tail: parseFloat(getComputedStyle(el).getPropertyValue("--zone-tail")) || 38 };
      setSize((s) => (s.w === next.w && s.h === next.h && s.tail === next.tail ? s : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Neuer Text oder neue Größe → wieder mit der größten Schrift anfangen
  const key = `${children}|${help ?? ""}|${size.w}x${size.h}`;
  const step = fit.key === key ? fit.step : 0;
  useLayoutEffect(() => {
    if (!text.current || !size.h) return;
    const tooTall = text.current.offsetHeight > size.h / SQRT2 + 2;
    if (tooTall && step < FONT_STEPS - 1) setFit({ key, step: step + 1 });
    else if (fit.key !== key) setFit({ key, step });
  }, [key, step, size.h, fit.key]);

  return (
    <div ref={box} className={styles.bubble} data-bubble>
      {size.w > 0 && (
        <svg className={styles.bubbleShape} width={size.w} height={size.h} aria-hidden>
          <path d={bubblePath(size.w, size.h, size.tail, x)} />
        </svg>
      )}
      <div ref={text} className={`${styles.bubbleText} ${step === FONT_STEPS - 1 ? styles.bubbleTextWide : ""}`} style={{ fontSize: `var(--bubble-font-${step + 1})` }}>
        {children}
        {help && <small className={styles.bubbleHelp}>{help}</small>}
      </div>
    </div>
  );
}

/** Umriss: Ellipse (w × h) mit Zipfel (Höhe tail) nach oben; Spitze bei tipX (0–1) über der Ellipse. */
function bubblePath(w: number, h: number, tail: number, tipX: number): string {
  const a = w / 2 - 0.5;
  const b = h / 2 - 0.5;
  const cx = w / 2;
  const cy = h / 2;
  const tip = Math.min(w - 4, Math.max(4, tipX * w));
  // Ansatz etwas näher zur Mitte als die Spitze → der Zipfel steht leicht schräg nach außen
  const base = Math.min(cx + a * 0.62, Math.max(cx - a * 0.62, cx + (tip - cx) * 0.7));
  const half = Math.min(15, a * 0.12);
  const onEllipse = (px: number) => cy - b * Math.sqrt(Math.max(0, 1 - ((px - cx) / a) ** 2));
  const p1 = `${(base - half).toFixed(2)} ${onEllipse(base - half).toFixed(2)}`;
  const p2 = `${(base + half).toFixed(2)} ${onEllipse(base + half).toFixed(2)}`;
  // im Uhrzeigersinn den langen Bogen um die Ellipse, dann über die Spitze zurück
  return `M ${p2} A ${a} ${b} 0 1 1 ${p1} L ${tip.toFixed(2)} ${(-tail + 2).toFixed(2)} Z`;
}
