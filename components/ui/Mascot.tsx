/* eslint-disable @next/next/no-img-element */
import { Theme } from "@/brand/themes";
import { SpeechBubble } from "./SpeechBubble";
import styles from "./ui.module.css";

type Mood = "happy" | "sad";

/** Große Variante: Sprechblase oben, Maskottchen darunter (Start, Ende, Danke). size="s" lässt Platz für Text darunter. */
export function MascotHero({ theme, mood, text, size = "l" }: { theme: Theme; mood: Mood; text: string; size?: "l" | "s" }) {
  return (
    <div className={`${styles.hero} ${size === "s" ? styles.heroSmall : ""}`}>
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

/** Frage ohne Claus (Theme „Implement“: Claus nur bei Start und Ende). */
export function PlainPrompt({ text, help }: { text: React.ReactNode; help?: string | null }) {
  return (
    <div className={styles.prompt}>
      {text}
      {help && <small className={styles.promptHelp}>{help}</small>}
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
