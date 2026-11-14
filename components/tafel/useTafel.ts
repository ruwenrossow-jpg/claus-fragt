"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TafelCommand, TafelLive, TafelRole, runTafel } from "@/lib/tafel";

/** Beamer/Steuerung: Verbindung zur Tafel (Host oder Spiegel, siehe lib/tafel.ts). */
export function useTafel(formId: string | null, role: TafelRole, questionIds: string[]) {
  const [live, setLive] = useState<TafelLive>({ run: null, people: 0, host: null, isHost: false });
  const ids = useRef(questionIds);
  ids.current = questionIds;
  const conn = useRef<ReturnType<typeof runTafel> | null>(null);
  useEffect(() => {
    if (!formId) return;
    conn.current = runTafel(formId, role, () => ids.current, setLive);
    return () => {
      conn.current?.close();
      conn.current = null;
    };
  }, [formId, role]);
  const command = useCallback((c: TafelCommand) => conn.current?.command(c), []);
  return { ...live, command };
}
