"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { learnFiUsernameSchema } from "@/lib/identity";

export async function updateUsername(formData: FormData) {
  const parsed = learnFiUsernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) redirect("/profile?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("users").update({ username: parsed.data }).eq("auth_user_id", user.id);
  if (error?.code === "23505") redirect("/profile?status=taken");
  if (error) redirect("/profile?status=error");
  redirect("/profile?status=saved");
}
