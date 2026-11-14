import { RequireLogin } from "@/components/admin/RequireLogin";

/** Editor, Ergebnisse, Tafel und Steuerung nur mit Anmeldung. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireLogin>{children}</RequireLogin>;
}
