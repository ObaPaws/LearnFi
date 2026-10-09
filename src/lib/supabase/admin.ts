import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdminConfig } from "./config";

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseAdminConfig();
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
