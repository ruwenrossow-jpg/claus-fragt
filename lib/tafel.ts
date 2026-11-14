/**
 * Tafel-Modus (wie Menti): Die Moderation zeigt Fragen am Beamer, alle beantworten sie gleichzeitig auf dem Handy.
 * Abgleich über Supabase Realtime (Broadcast + Presence) – ohne Tabelle, ohne Migration.
 * Die Moderation sendet ihren Stand alle 2 s (Herzschlag); Handys, die 7 s nichts hören, gelten als „Tafel aus“.
 * Antworten laufen wie immer über saveResponse (lib/data.ts); die Tafel zählt sie per loadAnswersSince.
 */
import { supabase } from "./supabase";

export type TafelPhase = "lobby" | "question" | "end";

export interface TafelState {
  phase: TafelPhase;
  /** aktuelle Frage (nur in phase „question“) */
  questionId: string | null;
}

const HEARTBEAT_MS = 2000;
const GONE_MS = 7000;
const channelName = (formId: string) => `tafel-${formId}`;

/** Moderation: sendet den Stand und zählt die verbundenen Handys. */
export function hostTafel(formId: string, onPeople: (n: number) => void) {
  let state: TafelState = { phase: "lobby", questionId: null };
  const ch = supabase.channel(channelName(formId), { config: { broadcast: { self: false } } });
  const send = () => ch.send({ type: "broadcast", event: "state", payload: state });
  ch.on("broadcast", { event: "hello" }, send);
  ch.on("presence", { event: "sync" }, () => onPeople(Object.keys(ch.presenceState()).length));
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

/** Handy: hört auf die Tafel. onState(null) = keine Tafel aktiv (noch nicht gestartet oder Moderation weg). */
export function joinTafel(formId: string, onState: (s: TafelState | null) => void): () => void {
  let last = 0;
  let current: TafelState | null = null;
  const me = crypto.randomUUID();
  const ch = supabase.channel(channelName(formId), { config: { presence: { key: me } } });
  ch.on("broadcast", { event: "state" }, ({ payload }) => {
    last = Date.now();
    const s = payload as TafelState;
    if (!current || current.phase !== s.phase || current.questionId !== s.questionId) {
      current = s;
      onState(s);
    }
  });
  ch.subscribe(async (s) => {
    if (s !== "SUBSCRIBED") return;
    await ch.track({});
    ch.send({ type: "broadcast", event: "hello", payload: {} });
  });
  const watch = setInterval(() => {
    if (current && Date.now() - last > GONE_MS) {
      current = null;
      onState(null);
    }
  }, 1000);
  return () => {
    clearInterval(watch);
    supabase.removeChannel(ch);
  };
}
