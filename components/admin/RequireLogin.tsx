"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isE2eBypass, useSession } from "@/lib/auth";
import styles from "./admin.module.css";

/** Admin-Seiten nur mit Anmeldung. Ohne Sitzung → /anmelden (danach zurück auf diese Seite). */
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();
  const [bypass, setBypass] = useState(false);
  useEffect(() => setBypass(isE2eBypass()), []);
  const missing = session === null && !bypass;
  useEffect(() => {
    if (missing) router.replace(`/anmelden?weiter=${encodeURIComponent(path + window.location.search)}`);
  }, [missing, router, path]);
  if (session || bypass) return <>{children}</>;
  return <p className={styles.pageLoading} role="status">Lädt …</p>;
}
