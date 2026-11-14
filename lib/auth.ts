/**
 * Anmeldung für Ersteller:innen per E-Mail-Link (Supabase Auth, kein Passwort). Teilnehmende brauchen nie einen Login.
 * Der Link öffnet /anmelden; supabase-js liest die Sitzung aus der Adresse und merkt sie sich im Browser.
 */
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** undefined = wird noch geprüft, null = nicht angemeldet */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** Schickt den Anmelde-Link. `next` = Seite nach der Anmeldung. Wirft eine verständliche Meldung. */
export async function sendLoginLink(email: string, next: string): Promise<void> {
  const redirect = `${window.location.origin}/anmelden?weiter=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (!error) return;
  const msg = error.message ?? "";
  if (/rate limit|too many|security purposes/i.test(msg)) throw new Error("Gerade wurden zu viele Links verschickt. Warte ein paar Minuten und versuch es nochmal.");
  if (/not authorized|address not/i.test(msg)) throw new Error("An diese Adresse kann noch keine Mail gehen. Für weitere Personen braucht Supabase einen eigenen Mail-Versand (SMTP).");
  if (/invalid|valid email/i.test(msg)) throw new Error("Das sieht nicht nach einer E-Mail-Adresse aus.");
  if (/fetch|network/i.test(msg)) throw new Error("Keine Verbindung. Bitte prüf das Internet und versuch es nochmal.");
  throw new Error(`Das hat nicht geklappt (${msg}).`);
}

/** Abmelden. Klappt der Server-Aufruf nicht (z. B. Netz weg), wird trotzdem auf diesem Gerät abgemeldet. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut().catch((e: Error) => ({ error: e }));
  if (error) await supabase.auth.signOut({ scope: "local" });
}

/** Nur lokal für den E2E-Test: ohne echte E-Mail an die Admin-Seiten (localStorage „claus-e2e“). Auf Vercel wirkungslos. */
export function isE2eBypass(): boolean {
  try {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname) && localStorage.getItem("claus-e2e") === "1";
  } catch {
    return false;
  }
}
