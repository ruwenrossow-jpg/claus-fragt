"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTween } from "./useTween";
import styles from "./ui.module.css";

interface Props {
  /** Zipfel nach oben (Claus steht darüber) oder unten (Claus steht darunter) */
  tail: "up" | "down";
  /** Spitze des Zipfels, waagerecht: 0 = linker Rand, 1 = rechter Rand. Änderungen werden animiert. */
  tailX: number;
  children: React.ReactNode;
  help?: string | null;
}

const SQRT2 = Math.SQRT2;
const TAIL = 40; // Höhe des Zipfels in px
const BASE = 15; // halbe Breite des Zipfels am Ansatz
const MIN_H = 104;
const MIN_W = 250; // kurze Texte: Ellipse nicht schmaler als das
const LONG = 90; // ab so vielen Zeichen etwas kleinere Schrift

/**
 * Ovale Sprechblase mit Zipfel. Ellipse und Zipfel sind EIN SVG-Pfad (ein Umriss, eine Füllung),
 * dadurch ist der Übergang immer nahtlos. Die Ellipse wird um den gemessenen Text herum berechnet
 * (Textbox = einbeschriebenes Rechteck, Faktor √2), deshalb wird bei langen Fragen nichts abgeschnitten.
 */
export function SpeechBubble({ tail, tailX, children, help }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, ew: 0 });
  const x = useTween(tailX);

  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !text.current) return;
      // offsetWidth/-Height = Layout-Pixel, unabhängig von CSS-zoom (Handy-Rahmen im Builder)
      const w = box.current.offsetWidth;
      // Ellipse um den Text: Breite/Höhe der Textbox × √2 (der Text sitzt im einbeschriebenen Rechteck)
      const ew = Math.min(w, Math.max(MIN_W, Math.ceil(text.current.offsetWidth * SQRT2) + 8));
      const h = Math.max(MIN_H, Math.ceil(text.current.offsetHeight * SQRT2));
      setSize((s) => (s.w === w && s.h === h && s.ew === ew ? s : { w, h, ew }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (text.current) ro.observe(text.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={`${styles.bubble} ${tail === "up" ? styles.bubbleUp : styles.bubbleDown} ${textLength(children) > LONG ? styles.bubbleLong : ""}`}
      style={{ height: size.h || undefined }}
    >
      {size.w > 0 && (
        <svg className={styles.bubbleShape} width={size.w} height={size.h} aria-hidden>
          <path d={bubblePath(size.w, size.ew, size.h, tail, x)} />
        </svg>
      )}
      <div ref={text} className={styles.bubbleText}>
        {children}
        {help && <small className={styles.bubbleHelp}>{help}</small>}
      </div>
    </div>
  );
}

const textLength = (n: React.ReactNode) => (typeof n === "string" ? n.length : 0);

/**
 * Umriss: Ellipse (ew × h, mittig in der Breite w) mit Zipfel.
 * Spitze bei tipX (0–1 der ganzen Breite, damit sie auf Claus zeigt) über bzw. unter der Ellipse.
 */
function bubblePath(w: number, ew: number, h: number, tail: "up" | "down", tipX: number): string {
  const a = ew / 2 - 0.5;
  const b = h / 2 - 0.5;
  const cx = w / 2;
  const cy = h / 2;
  const tip = Math.min(w - 4, Math.max(4, tipX * w));
  // Ansatz etwas näher zur Mitte als die Spitze → der Zipfel steht leicht schräg nach außen
  const base = Math.min(cx + a * 0.62, Math.max(cx - a * 0.62, cx + (tip - cx) * 0.7));
  const dir = tail === "up" ? -1 : 1;
  const onEllipse = (px: number) => cy + dir * b * Math.sqrt(Math.max(0, 1 - ((px - cx) / a) ** 2));
  const x1 = base - BASE;
  const x2 = base + BASE;
  const p1 = `${x1.toFixed(2)} ${onEllipse(x1).toFixed(2)}`;
  const p2 = `${x2.toFixed(2)} ${onEllipse(x2).toFixed(2)}`;
  const t = `${tip.toFixed(2)} ${(tail === "up" ? -TAIL : h + TAIL).toFixed(2)}`;
  // im Uhrzeigersinn den langen Bogen um die Ellipse, dann über die Spitze zurück
  return tail === "up" ? `M ${p2} A ${a} ${b} 0 1 1 ${p1} L ${t} Z` : `M ${p1} A ${a} ${b} 0 1 1 ${p2} L ${t} Z`;
}
