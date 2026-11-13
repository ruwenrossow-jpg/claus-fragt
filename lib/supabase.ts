import { createClient } from "@supabase/supabase-js";

// Akzeptiert beide Namensvarianten (neue Supabase-Integration: PUBLISHABLE_KEY, ältere: ANON_KEY).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);
export const missingEnv = [
  !url && "NEXT_PUBLIC_SUPABASE_URL",
  !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (oder NEXT_PUBLIC_SUPABASE_ANON_KEY)",
].filter(Boolean) as string[];

export const supabase = createClient(url || "http://localhost:54321", key || "missing-key");
