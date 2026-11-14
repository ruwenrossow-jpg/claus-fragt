import { createClient } from "@supabase/supabase-js";

// Akzeptiert beide Namensvarianten (neue Supabase-Integration: PUBLISHABLE_KEY, ältere: ANON_KEY).
// next.config.ts setzt einen öffentlichen Fallback, daher fehlen die Werte praktisch nie.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url || "http://localhost:54321", key || "missing-key");
