import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claus fragt",
  description: "Evaluationsbögen nach dem Claus-fragt-Framework",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
