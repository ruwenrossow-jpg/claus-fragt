/* eslint-disable @next/next/no-img-element */
import { Theme } from "@/brand/themes";
import { SpeechBubble } from "./SpeechBubble";
import styles from "./ui.module.css";

export type Mood = "happy" | "sad";
export type Side = "left" | "center" | "right";

/** Spitze des Zipfels je Position: zeigt auf Claus' Hände. */
const TAIL_X: Record<Side, number> = { left: 0.27, center: 0.62, right: 0.83 };

export interface StageProps {
  theme: Theme;
  mood: Mood;
  side: Side;
  text: string;
  help?: string | null;
}

/**
 * Bühne jedes Bogen-Screens: Claus oben, darunter die Sprechblase – immer an derselben Stelle (feste Zone im Raster).
 * Die Blase bleibt zentriert; nur Claus und der Zipfel wandern (links · Mitte · rechts).
 * Das Element bleibt über alle Screens erhalten, deshalb animiert der Wechsel per CSS-Transition (Claus) und useTween (Zipfel).
 */
export function Stage({ theme, mood, side, text, help }: StageProps) {
  return (
    <div className={`${styles.stage} ${styles[side]}`}>
      <div className={styles.track}>
        <img className={styles.mascot} src={theme.mascot[mood]} alt={theme.mascot.alt} />
      </div>
      <SpeechBubble tailX={TAIL_X[side]} help={help}>
        {text}
      </SpeechBubble>
    </div>
  );
}

/** Titel, Untertitel und Info-Chips in der Inhaltszone (Start, Ende, Danke, Geschlossen). */
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
