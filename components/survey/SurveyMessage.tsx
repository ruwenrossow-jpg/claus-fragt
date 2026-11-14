import { Theme, getTheme } from "@/brand/themes";
import { Intro, Mood, Stage } from "@/components/ui/Mascot";
import { PillButton, PillSpacer } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";

interface Props {
  /** Text in der Sprechblase */
  title: string;
  sub?: string;
  mood?: Mood;
  theme?: Theme;
  /** optionaler Haupt-Button (z. B. „Nochmal“); ohne Button bleibt der Platz frei */
  action?: { label: string; onClick: () => void };
}

/**
 * Hinweis-Screen im Bogen-Look (Laden, gibt es nicht mehr, keine Verbindung, Seite nicht gefunden).
 * Gleiches Raster wie jeder Bogen-Screen: Blase und Button-Platz stehen an derselben Stelle.
 */
export function SurveyMessage({ title, sub, mood = "sad", theme = getTheme(null), action }: Props) {
  return (
    <div className="survey-page">
      <Screen
        header={<TopBar />}
        stage={<Stage theme={theme} mood={mood} side="center" text={title} />}
        footer={action ? <PillButton onClick={action.onClick}>{action.label}</PillButton> : <PillSpacer />}
      >
        {sub && <Intro sub={sub} />}
      </Screen>
    </div>
  );
}
