import { NextResponse } from "next/server";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLearnerWatchableTutorial } from "@/lib/tutorial-access";

const bodySchema = z.object({ tutorialId: z.string().uuid(), position: z.number().int().min(0).max(86_400) });

export async function POST(request: Request) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save learning progress." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid watch progress." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: learner } = await profileForAuthUser(admin, user.id, "id");
  if (!learner) return NextResponse.json({ error: "Learner profile not found." }, { status: 403 });
  const { data: tutorial } = await admin.from("tutorials").select("status,is_published,video_processing_status,price_type,publication_number").eq("id", parsed.data.tutorialId).maybeSingle();
  if (!tutorial || !isLearnerWatchableTutorial({ status: tutorial.status, isPublished: tutorial.is_published, videoProcessingStatus: tutorial.video_processing_status, priceType: tutorial.price_type, publicationNumber: tutorial.publication_number })) return NextResponse.json({ error: "This tutorial is not available to watch." }, { status: 403 });
  const { data, error } = await admin.rpc("record_tutorial_watch", { p_learner_id: learner.id, p_tutorial_id: parsed.data.tutorialId, p_playback_position_seconds: parsed.data.position });
  if (error) return NextResponse.json({ error: "Watch progress could not be recorded." }, { status: 400 });
  const percent = Number(data ?? 0);
  if (percent >= 90) {
    const [{ data: progress }, { data: passedAttempt }] = await Promise.all([
      admin.from("tutorial_progress").select("assessment_passed").eq("learner_id", learner.id).eq("tutorial_id", parsed.data.tutorialId).maybeSingle(),
      admin.from("quiz_attempts").select("id,quiz_id,quizzes!inner(tutorial_id)").eq("learner_id", learner.id).eq("passed", true).eq("quizzes.tutorial_id", parsed.data.tutorialId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (progress?.assessment_passed && passedAttempt) await admin.rpc("finalize_tutorial_progress", { p_learner_id: learner.id, p_tutorial_id: parsed.data.tutorialId, p_quiz_id: passedAttempt.quiz_id, p_attempt_id: passedAttempt.id });
  }
  return NextResponse.json({ percent });
}
