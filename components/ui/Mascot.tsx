/* eslint-disable @next/next/no-img-element */
import { Theme } from "@/brand/themes";
import { SpeechBubble } from "./SpeechBubble";
import styles from "./ui.module.css";

type Mood = "happy" | "sad";
export type Side = "left" | "right";

/** Große Variante: Sprechblase oben, Maskottchen darunter (Start, Ende, Danke). size="s" lässt Platz für Text darunter. */
export function MascotHero({ theme, mood, text, size = "l" }: { theme: Theme; mood: Mood; text: string; size?: "l" | "s" }) {
  return (
    <div className={`${styles.hero} ${size === "s" ? styles.heroSmall : ""}`}>
      <SpeechBubble tail="down" tailX={0.66}>{text}</SpeechBubble>
      <img className={styles.heroMascot} src={theme.mascot[mood]} alt={theme.mascot.alt} />
    </div>
  );
}

/** Spitze des Zipfels je Seite: zeigt auf Claus' Hände. */
const TAIL_X: Record<Side, number> = { left: 0.27, right: 0.83 };

/**
 * Fragen-Screens: Claus oben links oder rechts, die Frage in der Sprechblase darunter.
 * Das Element bleibt zwischen den Fragen bestehen (gleiche Stelle im Baum), deshalb wandert Claus per
 * CSS-Transition hinüber und der Zipfel gleitet mit (useTween).
 */
export function MascotCorner({ theme, side, text, help }: { theme: Theme; side: Side; text: React.ReactNode; help?: string | null }) {
  return (
    <div className={`${styles.corner} ${side === "left" ? styles.cornerLeft : styles.cornerRight}`}>
      <div className={styles.track}>
        <img className={styles.cornerMascot} src={theme.mascot.happy} alt={theme.mascot.alt} />
      </div>
      <SpeechBubble tail="up" tailX={TAIL_X[side]} help={help}>
        {text}
      </SpeechBubble>
    </div>
  );
}

/** Titel, Untertitel und Info-Chips unter Claus (Start, Ende, Danke). */
export function Intro({ title, sub, tags }: { title?: string; sub?: string; tags?: string[] }) {
  return (
    <div className={styles.intro}>
      {title && <h1 className={styles.introTitle}>{title}</h1>}
      {sub && <p className={styles.introSub}>{sub}</p>}
      {tags && (
        <div className={styles.tags}>
          {tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
        </div>
      )}
    </div>
  );
}
