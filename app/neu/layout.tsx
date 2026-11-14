import type { Metadata } from "next";
import { RequireLogin } from "@/components/admin/RequireLogin";

export const metadata: Metadata = { title: "Neuer Bogen" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireLogin>{children}</RequireLogin>;
}
