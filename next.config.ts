import type { NextConfig } from "next";

// Die Vercel-Supabase-Integration setzt SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY ohne NEXT_PUBLIC_-Präfix.
// Im Browser sind aber nur NEXT_PUBLIC_-Variablen sichtbar. Darum reichen wir hier
// NUR URL und Publishable Key durch (beide öffentlich). Den Secret Key niemals hier eintragen!
// Fallback: öffentliche Werte (dürfen im Browser landen), damit Previews ohne Vercel-Variablen laufen.
const PUBLIC_URL = "https://zsoiiwtcynjwkhdcbkih.supabase.co";
const PUBLIC_KEY = "sb_publishable_vHf8tZks1Pvq99dLRJX-Nw_3Fbz47Vh";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || PUBLIC_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      PUBLIC_KEY,
  },
};

export default nextConfig;
