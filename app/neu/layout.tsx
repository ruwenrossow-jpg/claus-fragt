import type { Metadata } from "next";

export const metadata: Metadata = { title: "Neuer Bogen" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
