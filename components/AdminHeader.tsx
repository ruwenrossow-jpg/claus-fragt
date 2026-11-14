/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BRAND_ASSETS } from "@/brand/themes";
import { AccountMenu } from "./admin/AccountMenu";

/** Kopfzeile der Admin-Seiten mit InnoNord-Logo. */
/** `menu` = Links, die am Handy ins Konto-Menü wandern (dort fehlt in der Kopfzeile der Platz). */
export function AdminHeader({ children, menu }: { children?: React.ReactNode; menu?: React.ReactNode }) {
  return (
    <header className="admin-header">
      <Link href="/meine-boegen" className="admin-brand" aria-label="Claus fragt – Meine Bögen">
        <img src={BRAND_ASSETS.logo} alt="InnoNord" width={360} height={220} />
        <span>Claus fragt</span>
      </Link>
      <div className="row">{children}<AccountMenu menu={menu} /></div>
    </header>
  );
}
