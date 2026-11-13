/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BRAND_ASSETS } from "@/brand/themes";

/** Kopfzeile der Admin-Seiten mit InnoNord-Logo. */
export function AdminHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="admin-header">
      <Link href="/" className="admin-brand">
        <img src={BRAND_ASSETS.logo} alt="InnoNord" />
        <span>Claus fragt</span>
      </Link>
      <div className="row">{children}</div>
    </header>
  );
}
