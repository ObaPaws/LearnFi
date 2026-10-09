"use server";

import { redirect } from "next/navigation";
import { profileForAuthUser } from "@/lib/auth-profile";
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
  const { data: profile } = await profileForAuthUser(admin, user.id, "id");
  if (!profile) redirect("/auth/sign-in");
  const { error } = await admin.from("users").update({ username: parsed.data }).eq("id", profile.id);
  if (error?.code === "23505") redirect("/profile?status=taken");
  if (error) redirect("/profile?status=error");
  redirect("/profile?status=saved");
}
