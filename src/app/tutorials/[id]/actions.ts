"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tutorialIdSchema = z.string().uuid();

async function context(formData: FormData) {
  const parsedId = tutorialIdSchema.safeParse(formData.get("tutorialId"));
  if (!parsedId.success) redirect("/discover");
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: learner } = await profileForAuthUser(admin, user.id, "id");
  if (!learner) redirect("/auth/sign-in");
  const { data: tutorial } = await admin.from("tutorials").select("id,tutor_id,content_url").eq("id", parsedId.data).eq("is_published", true).maybeSingle();
  if (!tutorial) redirect("/discover");
  return { admin, learnerId: learner.id, tutorial };
}

export async function startTutorial(formData: FormData) {
  const { admin, learnerId, tutorial } = await context(formData);
  const { error: progressError } = await admin.from("tutorial_progress").upsert({ learner_id: learnerId, tutorial_id: tutorial.id, last_activity_at: new Date().toISOString() }, { onConflict: "learner_id,tutorial_id", ignoreDuplicates: true });
  const { error: engagementError } = await admin.from("tutor_engagement").upsert({ tutor_id: tutorial.tutor_id, learner_id: learnerId, tutorial_id: tutorial.id, event_type: "tutorial_start", idempotency_key: `start:${learnerId}:${tutorial.id}` }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (progressError || engagementError) redirect(`/tutorials/${tutorial.id}?status=error`);
  redirect(`/tutorials/${tutorial.id}?status=started`);
}

export async function completeTutorial(formData: FormData) {
  const { admin, learnerId, tutorial } = await context(formData);
  const { data: progress } = await admin.from("tutorial_progress").select("id,video_percent_watched,assessment_passed").eq("learner_id", learnerId).eq("tutorial_id", tutorial.id).maybeSingle();
  if (!progress) redirect(`/tutorials/${tutorial.id}?status=not-started`);
  if (Number(progress.video_percent_watched) < 90 || !progress.assessment_passed) redirect(`/tutorials/${tutorial.id}?status=completion-requirements`);
  const { data: attempt } = await admin.from("quiz_attempts").select("id,quiz_id,quizzes!inner(tutorial_id)").eq("learner_id", learnerId).eq("passed", true).eq("quizzes.tutorial_id", tutorial.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  if (!attempt) redirect(`/tutorials/${tutorial.id}?status=completion-requirements`);
  const { data: completed, error } = await admin.rpc("finalize_tutorial_progress", { p_learner_id: learnerId, p_tutorial_id: tutorial.id, p_quiz_id: attempt.quiz_id, p_attempt_id: attempt.id });
  redirect(error ? `/tutorials/${tutorial.id}?status=error` : completed ? `/tutorials/${tutorial.id}?status=completed` : `/tutorials/${tutorial.id}?status=completion-requirements`);
}
