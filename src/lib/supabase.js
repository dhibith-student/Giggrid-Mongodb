import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in giggrid-app/.env.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getSupabaseDebugInfo() {
  return {
    urlPresent: Boolean(SUPABASE_URL),
    anonKeyPresent: Boolean(SUPABASE_ANON_KEY),
    urlHost: SUPABASE_URL ? new URL(SUPABASE_URL).host : null,
  };
}

export async function testSupabaseConnection() {
  const test = await supabase.from("users").select("id", { count: "exact" }).limit(1);
  console.log("Supabase test:", test);
  return test;
}
