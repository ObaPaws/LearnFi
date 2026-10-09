"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeLearningPath(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("pathId"));
  if (!id.success) redirect("/learning-paths?status=error");
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const db = createSupabaseAdminClient();
  const { data: learner } = await profileForAuthUser(db, user.id, "id");
  if (!learner) redirect("/auth/sign-in");
  const { data: completed, error } = await db.rpc("finalize_learning_path", { p_learner_id: learner.id, p_learning_path_id: id.data });
  redirect(error ? "/learning-paths?status=error" : completed ? "/learning-paths?status=completed" : "/learning-paths?status=incomplete");
}
