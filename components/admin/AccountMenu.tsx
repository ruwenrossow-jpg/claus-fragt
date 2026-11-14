"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth";
import { Icon } from "./icons";

/** Angemeldet als … + Abmelden (Kopfzeile). */
export function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const email = session?.user.email;
  if (!email) return null;
  return (
    <button
      type="button"
      className="btn ghost"
      aria-label={`Abmelden (${email})`}
      data-logout
      onClick={async () => {
        await signOut();
        router.replace("/anmelden");
      }}
    >
      <Icon name="logout" size={18} /> <span className="hide-mobile">Abmelden</span>
    </button>
  );
}
