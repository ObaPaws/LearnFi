import "server-only";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function authenticatedAccount() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  const { data: account } = await profileForAuthUser(admin, user.id, "id,wallet_address,wallet_verified_at");
  if (!account) return null;
  return { admin, account };
}
