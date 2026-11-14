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
  if (/rate limit|too many|security purposes/i.test(msg)) throw new Error("Supabase verschickt gerade keine weiteren Mails (Limit pro Stunde). Hast du schon ein Passwort? Dann oben auf „Mit Passwort“. Sonst in einer Stunde nochmal.");
  if (/not authorized|address not/i.test(msg)) throw new Error("An diese Adresse kann noch keine Mail gehen. Für weitere Personen braucht Supabase einen eigenen Mail-Versand (SMTP).");
  if (/invalid|valid email/i.test(msg)) throw new Error("Das sieht nicht nach einer E-Mail-Adresse aus.");
  if (/fetch|network/i.test(msg)) throw new Error("Keine Verbindung. Bitte prüf das Internet und versuch es nochmal.");
  throw new Error(`Das hat nicht geklappt (${msg}).`);
}

/** Anmelden mit Passwort – ohne Mail, also auch ohne Mail-Limit. */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (!error) return;
  const msg = error.message ?? "";
  if (/invalid login|credentials/i.test(msg)) throw new Error("E-Mail oder Passwort stimmt nicht. Noch kein Passwort? Melde dich einmal per Link an und leg es im Konto-Menü fest.");
  if (/not confirmed/i.test(msg)) throw new Error("Bitte bestätige zuerst deine E-Mail über den Link in der Mail.");
  if (/rate limit|too many/i.test(msg)) throw new Error("Zu viele Versuche. Warte kurz und versuch es nochmal.");
  if (/fetch|network/i.test(msg)) throw new Error("Keine Verbindung. Bitte prüf das Internet und versuch es nochmal.");
  throw new Error(`Das hat nicht geklappt (${msg}).`);
}

export const MIN_PASSWORD = 8;

/** Passwort für das angemeldete Konto festlegen oder ändern. */
export async function setPassword(password: string): Promise<void> {
  if (password.length < MIN_PASSWORD) throw new Error(`Mindestens ${MIN_PASSWORD} Zeichen, bitte.`);
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return;
  const msg = error.message ?? "";
  if (/different from the old|same/i.test(msg)) return; // gleiches Passwort wie bisher: ist ja gesetzt
  if (/weak|short|characters/i.test(msg)) throw new Error("Das Passwort ist zu einfach. Nimm ein längeres, z. B. einen kurzen Satz.");
  if (/reauth|recent/i.test(msg)) throw new Error("Bitte melde dich einmal neu per Link an und leg das Passwort direkt danach fest.");
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
