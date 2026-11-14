"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/admin/icons";
import { Bereich, Vorschlag, bereicheFor } from "@/lib/ablauf";
import { Question } from "@/lib/types";
import { getType } from "@/question-types";
import styles from "./ablauf.module.css";

/**
 * Ablauf-Idee unter der Kopf-Karte: 5 Bereiche als Felder. Drüberfahren (Handy: antippen) zeigt Vorschläge,
 * ein Klick legt die Frage an. Ist die Leiste weggescrollt, sitzt sie klein am rechten Rand – gleiche Felder, gleiche Funktion.
 */
export function AblaufIdee({ style, questions, onAdd }: { style: string | null; questions: Question[]; onAdd: (v: Vorschlag, step: number) => void }) {
  const bereiche = bereicheFor(style);
  const used = new Set(questions.map((q) => q.step).filter((s) => s != null));
  const stripRef = useRef<HTMLElement>(null);
  const [rail, setRail] = useState(false);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRail(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section ref={stripRef} className={styles.strip} aria-label="Ablauf-Idee" data-ablauf>
        <p className={styles.head}>
          <strong>Ablauf-Idee</strong> <span className="hide-mobile">Fahr über einen Schritt – Claus hat Vorschläge.</span><span className="only-mobile">Tipp einen Schritt an – Claus hat Vorschläge.</span>
        </p>
        <Felder bereiche={bereiche} used={used} onAdd={onAdd} mode="strip" />
      </section>
      {rail && (
        <nav className={styles.rail} aria-label="Ablauf-Idee (klein)" data-ablauf-rail>
          <Felder bereiche={bereiche} used={used} onAdd={onAdd} mode="rail" />
        </nav>
      )}
    </>
  );
}

function Felder({ bereiche, used, onAdd, mode }: { bereiche: Bereich[]; used: Set<number | null>; onAdd: (v: Vorschlag, step: number) => void; mode: "strip" | "rail" }) {
  const [open, setOpen] = useState<number | null>(null);
  const box = useRef<HTMLOListElement>(null);

  // Antippen außerhalb schließt (Handy hat kein Hover)
  useEffect(() => {
    if (open == null) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <ol ref={box} className={mode === "rail" ? styles.railList : styles.list} onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(null)}>
      {bereiche.map((b) => {
        const isOpen = open === b.step;
        return (
          <li key={b.step} className={styles.item} onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(b.step)}>
            <button
              type="button"
              className={styles.field}
              aria-expanded={isOpen}
              aria-label={`Schritt ${b.step}: ${b.name}`}
              data-done={used.has(b.step) || undefined}
              onClick={() => setOpen(b.step)}
            >
              <span className={styles.no}>{used.has(b.step) ? <Icon name="check" size={14} /> : b.step}</span>
              {mode === "strip" && (
                <span className={styles.text}>
                  <strong>{b.name}</strong>
                  <span>{getType(b.kind).label}</span>
                </span>
              )}
            </button>
            {isOpen && (
              <div className={styles.popWrap} data-ablauf-pop>
                <div className={styles.pop}>
                  <p className={styles.popHead}>
                    <strong>{b.step} · {b.name}</strong> <span>{getType(b.kind).label}</span>
                  </p>
                  <p className={styles.warum}>{b.warum}</p>
                  <ul className={styles.vorschlaege}>
                    {b.vorschlaege.map((v) => (
                      <li key={v.label}>
                        <button
                          type="button"
                          className={styles.vorschlag}
                          onClick={() => {
                            onAdd(v, b.step);
                            setOpen(null);
                          }}
                        >
                          <span>
                            {v.label}
                            <small>{getType(v.kind).label}</small>
                          </span>
                          <Icon name="plus" size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
