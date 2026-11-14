/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BRAND_ASSETS } from "@/brand/themes";
import { AccountMenu } from "./admin/AccountMenu";

/** Kopfzeile der Admin-Seiten mit InnoNord-Logo. */
export function AdminHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="admin-header">
      <Link href="/meine-boegen" className="admin-brand" aria-label="Claus fragt – Meine Bögen">
        <img src={BRAND_ASSETS.logo} alt="InnoNord" width={360} height={220} />
        <span>Claus fragt</span>
      </Link>
      <div className="row">{children}<AccountMenu /></div>
    </header>
  );
}
