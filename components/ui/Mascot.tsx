/* eslint-disable @next/next/no-img-element */
import { Theme } from "@/brand/themes";
import { SpeechBubble } from "./SpeechBubble";
import styles from "./ui.module.css";

type Mood = "happy" | "sad";

/** Große Variante: Sprechblase oben, Maskottchen mittig darunter (Start-, End-Screens). */
export function MascotHero({ theme, mood, text }: { theme: Theme; mood: Mood; text: string }) {
  return (
    <div className={styles.hero}>
      <SpeechBubble tail="down-right">{text}</SpeechBubble>
      <img className={styles.heroMascot} src={theme.mascot[mood]} alt={theme.mascot.alt} />
    </div>
  );
}

/** Kleine Variante: Maskottchen in der Ecke, Sprechblase mit Frage darunter (Fragen-Screens). */
export function MascotCorner({ theme, mood = "happy", side, text, help }: { theme: Theme; mood?: Mood; side: "left" | "right"; text: React.ReactNode; help?: string | null }) {
  return (
    <div className={`${styles.corner} ${side === "left" ? styles.cornerLeft : styles.cornerRight}`}>
      <img className={styles.cornerMascot} src={theme.mascot[mood]} alt={theme.mascot.alt} />
      <SpeechBubble tail={side === "left" ? "up-left" : "up-right"} help={help}>
        {text}
      </SpeechBubble>
    </div>
  );
}
