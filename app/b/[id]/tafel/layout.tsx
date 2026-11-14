import type { Metadata } from "next";
import { formMeta } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const meta = await formMeta((await params).id);
  return { title: meta ? `Tafel: ${meta.title}` : "Bogen" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
