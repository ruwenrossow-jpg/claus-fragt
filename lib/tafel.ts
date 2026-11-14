/**
 * Tafel-Modus (wie Menti): Die Moderation zeigt Fragen am Beamer, alle beantworten sie gleichzeitig auf dem Handy.
 * Abgleich über Supabase Realtime (Broadcast + Presence) – ohne Tabelle, ohne Migration.
 *
 * Rollen auf dem Kanal `tafel-<formId>`:
 * - Beamer (/b/<id>/tafel) = Host: hält den Stand, sendet ihn alle 2 s (Herzschlag) und auf jede Änderung, zählt Handys per Presence.
 * - Steuerung (/b/<id>/tafel/steuerung) = Fernbedienung am Laptop/Handy: sendet Befehle, zeigt den gespiegelten Stand. Zählt nicht als Handy.
 * - Handys (/f/<slug>) hören nur auf phase + questionId. Wer 7 s nichts hört, gilt als „Tafel aus“.
 * Antworten laufen wie immer über saveResponse (lib/data.ts); gezählt wird per loadAnswersSince.
 */
import { supabase } from "./supabase";

export type TafelPhase = "lobby" | "question" | "end";
/** Darstellung von Freitext am Beamer: Wortwolke oder Karten (wie Menti) */
export type TafelView = "wolke" | "karten";

export interface TafelState {
  phase: TafelPhase;
  /** aktuelle Frage (nur in phase „question“) */
  questionId: string | null;
  /** ab hier nur für Beamer/Steuerung */
  index?: number;
  show?: boolean;
  view?: TafelView;
  /** Abgaben ab diesem Zeitpunkt zählen (ISO) */
  since?: string;
  /** verbundene Handys */
  people?: number;
}

export type TafelCommand =
  | { cmd: "next" }
  | { cmd: "back" }
  | { cmd: "show" }
  | { cmd: "view"; view: TafelView }
  | { cmd: "goto"; index: number }
  | { cmd: "lobby" }
  | { cmd: "end" }
  | { cmd: "restart" };

const HEARTBEAT_MS = 2000;
const GONE_MS = 7000;
const channelName = (formId: string) => `tafel-${formId}`;

/** Beamer: sendet den Stand, zählt die Handys und nimmt Befehle der Steuerung an. */
export function hostTafel(formId: string, onPeople: (n: number) => void, onCommand: (c: TafelCommand) => void) {
  let state: TafelState = { phase: "lobby", questionId: null };
  let people = 0;
  const ch = supabase.channel(channelName(formId), { config: { broadcast: { self: false } } });
  const send = () => ch.send({ type: "broadcast", event: "state", payload: { ...state, people } });
  ch.on("broadcast", { event: "hello" }, send);
  ch.on("broadcast", { event: "cmd" }, ({ payload }) => onCommand(payload as TafelCommand));
  ch.on("presence", { event: "sync" }, () => {
    people = Object.keys(ch.presenceState()).length;
    onPeople(people);
    send();
  });
  ch.subscribe((s) => s === "SUBSCRIBED" && send());
  const beat = setInterval(send, HEARTBEAT_MS);
  return {
    publish(next: TafelState) {
      state = next;
      send();
    },
    close() {
      clearInterval(beat);
      supabase.removeChannel(ch);
    },
  };
}

/** Hört auf den Beamer. onState(null) = kein Beamer aktiv (noch nicht offen oder geschlossen). */
function listen(formId: string, presence: boolean, onState: (s: TafelState | null) => void, onlyFlow: boolean) {
  let last = 0;
  let current: TafelState | null = null;
  const ch = supabase.channel(channelName(formId), presence ? { config: { presence: { key: crypto.randomUUID() } } } : undefined);
  ch.on("broadcast", { event: "state" }, ({ payload }) => {
    last = Date.now();
    const s = payload as TafelState;
    const changed = !current || (onlyFlow ? current.phase !== s.phase || current.questionId !== s.questionId : JSON.stringify(current) !== JSON.stringify(s));
    if (changed) {
      current = s;
      onState(s);
    }
  });
  ch.subscribe(async (s) => {
    if (s !== "SUBSCRIBED") return;
    if (presence) await ch.track({});
    ch.send({ type: "broadcast", event: "hello", payload: {} });
  });
  const watch = setInterval(() => {
    if (current && Date.now() - last > GONE_MS) {
      current = null;
      onState(null);
    }
  }, 1000);
  return {
    send: (c: TafelCommand) => ch.send({ type: "broadcast", event: "cmd", payload: c }),
    close: () => {
      clearInterval(watch);
      supabase.removeChannel(ch);
    },
  };
}

/** Handy: zählt als Teilnehmer:in (Presence) und reagiert nur auf Phase/Frage. */
export function joinTafel(formId: string, onState: (s: TafelState | null) => void): () => void {
  return listen(formId, true, onState, true).close;
}

/** Steuerung (Laptop/Handy der Moderation): sieht den vollen Stand und schickt Befehle an den Beamer. */
export function remoteTafel(formId: string, onState: (s: TafelState | null) => void) {
  return listen(formId, false, onState, false);
}

/** Beschriftung des Weiter-Buttons (Beamer und Steuerung gleich). */
export function nextLabel(phase: TafelPhase, index: number, total: number): string {
  if (phase === "lobby") return "Alle drin – los geht's";
  if (phase === "end") return "";
  return index + 1 < total ? "Nächste Frage" : "Gemeinsamen Teil beenden";
}
