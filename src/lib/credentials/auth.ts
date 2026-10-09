import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function authenticatedAccount() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  const { data: account } = await admin.from("users").select("id,wallet_address,wallet_verified_at").eq("auth_user_id", user.id).maybeSingle();
  if (!account) return null;
  return { admin, account };
}
