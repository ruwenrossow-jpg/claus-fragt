/**
 * Tafel-Modus (wie Menti): Die Moderation zeigt Fragen am Beamer, alle beantworten sie gleichzeitig auf dem Handy.
 * Abgleich über Supabase Realtime (Broadcast + Presence) – ohne Tabelle, ohne Migration.
 *
 * Rollen auf dem Kanal `tafel-<formId>`:
 * - Host: hält den Stand (Run), sendet ihn alle 2 s (Herzschlag) und auf jede Änderung, zählt Handys per Presence, nimmt Befehle an.
 *   Es gibt immer genau einen Host. Wahl: Beamer schlägt Steuerung, sonst gewinnt der ältere. Der Beamer übernimmt den Stand
 *   einer Steuerung, die gerade Host ist; ein zweites Beamer-Fenster spiegelt nur. Ist kein Beamer offen, ist die Steuerung Host –
 *   die Handys folgen also auch ohne Beamer der Moderation (häufige Falle: nur die Steuerung offen).
 * - Alle anderen Beamer/Steuerungen: spiegeln den Stand und schicken Befehle an den Host.
 * - Handys (/f/<slug>) hören nur auf phase + questionId. Wer 15 s nichts hört, gilt als „Tafel aus“.
 * Antworten laufen wie immer über saveResponse (lib/data.ts); gezählt wird per loadAnswersSince.
 */
import { supabase } from "./supabase";

export type TafelPhase = "lobby" | "question" | "end";
/** Darstellung von Freitext am Beamer: Wortwolke oder Karten (wie Menti) */
export type TafelView = "wolke" | "karten";
export type TafelRole = "beamer" | "steuerung";

/** Wer gerade Host ist (für die Wahl): Rolle, Startzeit, Zufalls-id als Gleichstand-Brecher */
export interface HostRank {
  role: TafelRole;
  at: number;
  id: string;
}

/** Stand der Tafel beim Host; liegt zusätzlich im Browser (localStorage), damit ein Neuladen nichts verliert. */
export interface TafelRun {
  phase: TafelPhase;
  index: number;
  /** Ergebnis am Beamer sichtbar? (erst auf „Zeigen“) */
  show: boolean;
  view: TafelView;
  /** nur Abgaben ab diesem Zeitpunkt zählen (ältere Events tauchen nicht auf) */
  since: string;
}

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
  host?: HostRank;
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
/** so lange wartet ein neues Fenster auf einen Host, bevor es selbst Host wird */
const DECIDE_MS = 2500;
/** Host weg → ein anderes Fenster übernimmt */
const HOST_GONE_MS = 6000;
/** Handys: so lange ohne Herzschlag, dann „Tafel aus“ (länger als die Übernahme, damit ein Neuladen des Beamers niemanden rauswirft) */
const PHONE_GONE_MS = 15000;
const channelName = (formId: string) => `tafel-${formId}`;
const storeKey = (formId: string) => `tafel:${formId}`;

export const freshRun = (): TafelRun => ({ phase: "lobby", index: 0, show: false, view: "wolke", since: new Date(Date.now() - 30_000).toISOString() });

/** Ein Befehl (Taste, Klick am Beamer oder von der Steuerung) → neuer Stand. */
export function applyCommand(run: TafelRun, c: TafelCommand, total: number): TafelRun {
  const last = Math.max(0, total - 1);
  switch (c.cmd) {
    case "next":
      if (run.phase === "lobby") return total ? { ...run, phase: "question", index: 0, show: false } : { ...run, phase: "end" };
      if (run.phase === "question") return run.index < last ? { ...run, index: run.index + 1, show: false } : { ...run, phase: "end" };
      return run;
    case "back":
      if (run.phase === "end") return total ? { ...run, phase: "question", index: last, show: true } : { ...run, phase: "lobby" };
      if (run.phase === "question") return run.index > 0 ? { ...run, index: run.index - 1, show: true } : { ...run, phase: "lobby", show: false };
      return run;
    case "show":
      return run.phase === "question" ? { ...run, show: !run.show } : run;
    case "view":
      return { ...run, view: c.view };
    case "goto":
      return total ? { ...run, phase: "question", index: Math.min(Math.max(0, c.index), last), show: false } : run;
    case "lobby":
      return { ...run, phase: "lobby", show: false };
    case "end":
      return { ...run, phase: "end" };
    case "restart":
      // neue Runde: nur Abgaben ab jetzt (beim ersten Öffnen zählen die letzten 30 s mit, falls schon jemand abgeschickt hat)
      return { ...freshRun(), since: new Date().toISOString() };
  }
}

/** Stand, den der Host sendet (Frage-id aus dem Index). */
export function stateOf(run: TafelRun, questionIds: string[]): TafelState {
  const index = Math.min(run.index, Math.max(0, questionIds.length - 1));
  const questionId = run.phase === "question" ? (questionIds[index] ?? null) : null;
  const phase = run.phase === "question" && !questionId ? "lobby" : run.phase;
  return { phase, questionId, index, show: run.show, view: run.view, since: run.since };
}

const runOf = (s: TafelState): TafelRun => ({ ...freshRun(), phase: s.phase, index: s.index ?? 0, show: Boolean(s.show), view: s.view ?? "wolke", ...(s.since ? { since: s.since } : {}) });
const WEIGHT: Record<TafelRole, number> = { beamer: 2, steuerung: 1 };
/** a ist der bessere Host als b? Beamer vor Steuerung, dann der ältere. */
const better = (a: HostRank, b: HostRank) => (WEIGHT[a.role] !== WEIGHT[b.role] ? WEIGHT[a.role] > WEIGHT[b.role] : a.at !== b.at ? a.at < b.at : a.id < b.id);

function loadRun(formId: string): TafelRun {
  try {
    const saved = localStorage.getItem(storeKey(formId));
    return saved ? { ...freshRun(), ...(JSON.parse(saved) as TafelRun) } : freshRun();
  } catch {
    return freshRun();
  }
}

export interface TafelLive {
  /** aktueller Stand (eigener als Host, sonst gespiegelt). null = noch nicht entschieden */
  run: TafelRun | null;
  people: number;
  /** Rolle des Hosts (null = noch keiner) */
  host: TafelRole | null;
  /** dieses Fenster ist der Host */
  isHost: boolean;
}

/**
 * Beamer und Steuerung: verbindet sich, wird Host oder Spiegel (siehe oben) und liefert den Stand.
 * `questionIds` = ids der Tafel-Fragen in Reihenfolge (Getter, damit Änderungen ankommen).
 */
export function runTafel(formId: string, role: TafelRole, questionIds: () => string[], onChange: (v: TafelLive) => void) {
  const me: HostRank = { role, at: Date.now(), id: crypto.randomUUID() };
  let isHost = false;
  let run: TafelRun | null = null;
  let people = 0;
  let hostRole: TafelRole | null = null;
  let last = 0;
  let closed = false;
  const ch = supabase.channel(channelName(formId), { config: { broadcast: { self: false } } });
  const emit = () => !closed && onChange({ run, people, host: hostRole, isHost });
  const send = () => {
    if (isHost && run) ch.send({ type: "broadcast", event: "state", payload: { ...stateOf(run, questionIds()), people, host: me } satisfies TafelState });
  };
  const save = () => {
    try {
      if (run) localStorage.setItem(storeKey(formId), JSON.stringify(run));
    } catch {}
  };
  const become = (base: TafelRun) => {
    isHost = true;
    hostRole = role;
    run = base;
    people = Object.keys(ch.presenceState()).length;
    save();
    emit();
    send();
  };
  const adopt = (s: TafelState) => {
    run = runOf(s);
    people = s.people ?? 0;
    hostRole = s.host?.role ?? "beamer";
    emit();
  };
  const apply = (c: TafelCommand) => {
    if (!run) return;
    run = applyCommand(run, c, questionIds().length);
    save();
    emit();
    send();
  };

  ch.on("broadcast", { event: "hello" }, send);
  ch.on("broadcast", { event: "cmd" }, ({ payload }) => isHost && apply(payload as TafelCommand));
  ch.on("broadcast", { event: "state" }, ({ payload }) => {
    const s = payload as TafelState;
    const h = s.host ?? { role: "beamer", at: 0, id: "" };
    last = Date.now();
    if (isHost) {
      // zwei Hosts (z. B. gleichzeitig geöffnet): der schlechtere gibt ab und spiegelt
      if (better(h, me)) {
        isHost = false;
        adopt(s);
      }
      return;
    }
    // Beamer kommt dazu, während die Steuerung Host ist → Beamer übernimmt ihren Stand
    if (role === "beamer" && h.role === "steuerung") return become(runOf(s));
    adopt(s);
  });
  ch.on("presence", { event: "sync" }, () => {
    if (!isHost) return;
    people = Object.keys(ch.presenceState()).length;
    emit();
    send();
  });
  ch.subscribe((s) => s === "SUBSCRIBED" && ch.send({ type: "broadcast", event: "hello", payload: {} }));
  const decide = setTimeout(() => !isHost && !last && become(loadRun(formId)), DECIDE_MS);
  const beat = setInterval(send, HEARTBEAT_MS);
  const watch = setInterval(() => {
    if (!isHost && last && Date.now() - last > HOST_GONE_MS) become(run ?? loadRun(formId));
  }, 1000);
  return {
    /** Befehl: als Host direkt, sonst an den Host */
    command(c: TafelCommand) {
      if (isHost) apply(c);
      else if (run) ch.send({ type: "broadcast", event: "cmd", payload: c });
    },
    close() {
      closed = true;
      clearTimeout(decide);
      clearInterval(beat);
      clearInterval(watch);
      supabase.removeChannel(ch);
    },
  };
}

/** Handy: zählt als Teilnehmer:in (Presence) und reagiert nur auf Phase/Frage. onState(null) = keine Tafel aktiv. */
export function joinTafel(formId: string, onState: (s: TafelState | null) => void): () => void {
  let last = 0;
  let current: TafelState | null = null;
  const ch = supabase.channel(channelName(formId), { config: { presence: { key: crypto.randomUUID() } } });
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
    if (current && Date.now() - last > PHONE_GONE_MS) {
      current = null;
      onState(null);
    }
  }, 1000);
  return () => {
    clearInterval(watch);
    supabase.removeChannel(ch);
  };
}

/** Beschriftung des Weiter-Buttons (Beamer und Steuerung gleich). */
export function nextLabel(phase: TafelPhase, index: number, total: number): string {
  if (phase === "lobby") return "Alle drin – los geht's";
  if (phase === "end") return "";
  return index + 1 < total ? "Nächste Frage" : "Gemeinsamen Teil beenden";
}
