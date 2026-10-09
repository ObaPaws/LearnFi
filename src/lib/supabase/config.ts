// Unreachable local endpoint used when Supabase isn't configured, so requests fail fast
// and return `{ data: null, error }` instead of crashing server-rendered pages.
const FALLBACK_URL = "http://127.0.0.1:54321";
const FALLBACK_KEY = "supabase-not-configured";

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn("Supabase environment is not configured. Rendering without database data.");
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) return { url, key };
  warnOnce();
  return { url: url || FALLBACK_URL, key: key || FALLBACK_KEY };
}

export function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url, key };
  warnOnce();
  return { url: url || FALLBACK_URL, key: key || FALLBACK_KEY };
}
