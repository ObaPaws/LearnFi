"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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
  const { data: learner } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
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
  if (!tutorial.content_url || !/^https:\/\//i.test(tutorial.content_url)) redirect(`/tutorials/${tutorial.id}?status=content-unavailable`);
  const { data: progress } = await admin.from("tutorial_progress").select("id").eq("learner_id", learnerId).eq("tutorial_id", tutorial.id).maybeSingle();
  if (!progress) redirect(`/tutorials/${tutorial.id}?status=not-started`);
  const now = new Date().toISOString();
  const [{ error: progressError }, { error: activityError }, { error: engagementError }] = await Promise.all([
    admin.from("tutorial_progress").update({ progress_percent: 100, completed_at: now, last_activity_at: now }).eq("id", progress.id),
    admin.from("learning_activities").upsert({ learner_id: learnerId, tutorial_id: tutorial.id, event_type: "tutorial_completed", idempotency_key: `complete:${learnerId}:${tutorial.id}`, occurred_at: now }, { onConflict: "learner_id,idempotency_key", ignoreDuplicates: true }),
    admin.from("tutor_engagement").upsert({ tutor_id: tutorial.tutor_id, learner_id: learnerId, tutorial_id: tutorial.id, event_type: "tutorial_complete", idempotency_key: `complete:${learnerId}:${tutorial.id}` }, { onConflict: "idempotency_key", ignoreDuplicates: true }),
  ]);
  if (progressError || activityError || engagementError) redirect(`/tutorials/${tutorial.id}?status=error`);
  redirect(`/tutorials/${tutorial.id}?status=completed`);
}
