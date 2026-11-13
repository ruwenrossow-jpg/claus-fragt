import styles from "./ui.module.css";

export type TailDirection = "up-left" | "up-right" | "down-right";

const TAIL_CLASS: Record<TailDirection, string> = {
  "up-left": styles.tailUpLeft,
  "up-right": styles.tailUpRight,
  "down-right": styles.tailDownRight,
};

/** Ovale Sprechblase mit Zipfel. Der Zipfel überdeckt den Rand der Ellipse, dadurch wirkt sie aus einem Guss. */
export function SpeechBubble({ tail, children, help }: { tail: TailDirection; children: React.ReactNode; help?: string | null }) {
  return (
    <div className={styles.bubble}>
      <svg className={`${styles.tail} ${TAIL_CLASS[tail]}`} viewBox="0 0 34 44" aria-hidden>
        <polygon points="2,44 6,0 32,44" fill="var(--survey-bubble)" />
        <polyline points="2,40 6,0 32,40" fill="none" stroke="var(--survey-ink)" strokeWidth="1" />
      </svg>
      <span className={styles.bubbleText}>
        {children}
        {help && <small className={styles.bubbleHelp}>{help}</small>}
      </span>
    </div>
  );
}
