"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveLearnerPreferences(formData: FormData) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const ids = formData.getAll("styleIds").map(String);
  const parsedIds = z.array(z.string().uuid()).max(12).safeParse(ids);
  if (!parsedIds.success) redirect("/dashboard?status=preferences-error");
  const admin = createSupabaseAdminClient();
  const { data: account } = await profileForAuthUser(admin, user.id, "id");
  if (!account) redirect("/auth/sign-in");
  const { data: styles } = await admin.from("teaching_styles").select("id").in("id", parsedIds.data.length ? parsedIds.data : ["00000000-0000-0000-0000-000000000000"]);
  if ((styles ?? []).length !== parsedIds.data.length || new Set(parsedIds.data).size !== parsedIds.data.length) redirect("/dashboard?status=preferences-error");
  const preferences = parsedIds.data.map((styleId) => ({ style_id: styleId, weight: z.coerce.number().int().min(1).max(5).safeParse(formData.get(`weight_${styleId}`) ?? 3) }));
  if (preferences.some((preference) => !preference.weight.success)) redirect("/dashboard?status=preferences-error");
  const { error: deleteError } = await admin.from("learner_teaching_preferences").delete().eq("learner_id", account.id);
  const { error: insertError } = preferences.length ? await admin.from("learner_teaching_preferences").insert(preferences.map((preference) => ({ learner_id: account.id, style_id: preference.style_id, weight: preference.weight.success ? preference.weight.data : 3 }))) : { error: null };
  redirect(deleteError || insertError ? "/dashboard?status=preferences-error" : "/dashboard?status=preferences-saved");
}
