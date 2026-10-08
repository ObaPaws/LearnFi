"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLearnerWatchableTutorial } from "@/lib/tutorial-access";

const idSchema = z.string().uuid();

async function learnerContext() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: learner } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!learner) redirect("/auth/sign-in");
  return { admin, learnerId: learner.id };
}

export async function startAcademyTutorial(formData: FormData) {
  const id = idSchema.safeParse(formData.get("tutorialId"));
  if (!id.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: tutorial } = await admin.from("tutorials").select("id,slug,tutor_id,status,is_published,video_processing_status,price_type,publication_number").eq("id", id.data).maybeSingle();
  if (!tutorial || !isLearnerWatchableTutorial({ status: tutorial.status, isPublished: tutorial.is_published, videoProcessingStatus: tutorial.video_processing_status, priceType: tutorial.price_type, publicationNumber: tutorial.publication_number })) redirect("/academy");
  const now = new Date().toISOString();
  const [{ error: progressError }, { error: engagementError }] = await Promise.all([
    admin.from("tutorial_progress").upsert({ learner_id: learnerId, tutorial_id: tutorial.id, last_activity_at: now }, { onConflict: "learner_id,tutorial_id", ignoreDuplicates: true }),
    admin.from("tutor_engagement").upsert({ tutor_id: tutorial.tutor_id, learner_id: learnerId, tutorial_id: tutorial.id, event_type: "tutorial_start", idempotency_key: `start:${learnerId}:${tutorial.id}` }, { onConflict: "idempotency_key", ignoreDuplicates: true }),
  ]);
  if (progressError || engagementError) redirect(`/academy/${tutorial.slug}?status=error`);
  redirect(`/academy/${tutorial.slug}?status=started`);
}

export async function submitTutorialQuiz(formData: FormData) {
  const parsed = z.object({ tutorialId: idSchema, quizId: idSchema, slug: z.string().min(1).max(180) }).safeParse({ tutorialId: formData.get("tutorialId"), quizId: formData.get("quizId"), slug: formData.get("slug") });
  if (!parsed.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: tutorial } = await admin.from("tutorials").select("status,is_published,video_processing_status,price_type,publication_number").eq("id", parsed.data.tutorialId).eq("slug", parsed.data.slug).maybeSingle();
  if (!tutorial || !isLearnerWatchableTutorial({ status: tutorial.status, isPublished: tutorial.is_published, videoProcessingStatus: tutorial.video_processing_status, priceType: tutorial.price_type, publicationNumber: tutorial.publication_number })) redirect(`/academy/${parsed.data.slug}?status=quiz-unavailable`);
  const { data: watchedProgress } = await admin.from("tutorial_progress").select("video_percent_watched").eq("learner_id", learnerId).eq("tutorial_id", parsed.data.tutorialId).maybeSingle();
  if (!watchedProgress || Number(watchedProgress.video_percent_watched) < 90) redirect(`/academy/${parsed.data.slug}?status=assessment-watch-required`);
  const { data: quiz } = await admin.from("quizzes").select("id,title,passing_score,tutorial_id").eq("id", parsed.data.quizId).eq("tutorial_id", parsed.data.tutorialId).maybeSingle();
  const { data: questions } = await admin.from("tutorial_quiz_questions").select("id,tutorial_quiz_options(id)").eq("quiz_id", parsed.data.quizId).order("position");
  if (!quiz || !questions?.length) redirect(`/academy/${parsed.data.slug}?status=quiz-unavailable`);
  const questionIds = new Set(questions.map((question: any) => question.id));
  const submitted = [...formData.entries()].filter(([key]) => key.startsWith("answer_"));
  const selected = submitted.map(([key, value]) => ({ questionId: key.slice(7), optionId: String(value) }));
  if (selected.length !== questions.length || selected.some((answer) => !questionIds.has(answer.questionId))) redirect(`/academy/${parsed.data.slug}?status=quiz-incomplete`);
  const optionIds = new Set(questions.flatMap((question: any) => (question.tutorial_quiz_options ?? []).map((option: any) => option.id)));
  if (selected.some((answer) => !optionIds.has(answer.optionId))) redirect(`/academy/${parsed.data.slug}?status=quiz-incomplete`);
  const { data: answerKeys } = await admin.from("tutorial_quiz_answers").select("question_id,correct_option_id").in("question_id", [...questionIds]);
  const answerKeyMap = new Map((answerKeys ?? []).map((answer) => [answer.question_id, answer.correct_option_id]));
  const correctCount = selected.filter((answer) => answerKeyMap.get(answer.questionId) === answer.optionId).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.passing_score;
  const { data: attempt, error: attemptError } = await admin.from("quiz_attempts").insert({ quiz_id: quiz.id, learner_id: learnerId, score, passed, question_count: questions.length }).select("id").single();
  if (attemptError || !attempt) redirect(`/academy/${parsed.data.slug}?status=error`);
  const { error: answersError } = await admin.from("quiz_attempt_answers").insert(selected.map((answer) => ({ attempt_id: attempt.id, question_id: answer.questionId, selected_option_id: answer.optionId, is_correct: answerKeyMap.get(answer.questionId) === answer.optionId })));
  if (answersError) redirect(`/academy/${parsed.data.slug}?status=error`);
  if (passed) {
    await admin.rpc("publish_learner_xp", { p_learner_id: learnerId, p_reward_type: "quiz_passed", p_source_id: quiz.id });
    await admin.from("tutorial_progress").update({ assessment_passed: true }).eq("learner_id", learnerId).eq("tutorial_id", parsed.data.tutorialId);
    const { data: completed } = await admin.rpc("finalize_tutorial_progress", { p_learner_id: learnerId, p_tutorial_id: parsed.data.tutorialId, p_quiz_id: quiz.id, p_attempt_id: attempt.id });
    redirect(`/academy/${parsed.data.slug}?status=${completed ? "completed" : "passed"}`);
  }
  redirect(`/academy/${parsed.data.slug}?status=retry`);
}

export async function submitTutorialReview(formData: FormData) {
  const parsed = z.object({ tutorialId: idSchema, clarity: z.coerce.number().int().min(1).max(5), effectiveness: z.coerce.number().int().min(1).max(5), accuracy: z.coerce.number().int().min(1).max(5), usefulness: z.coerce.number().int().min(1).max(5), wouldLearnAgain: z.enum(["yes", "no", ""]), feedback: z.string().trim().max(2000) }).safeParse({ tutorialId: formData.get("tutorialId"), clarity: formData.get("clarity"), effectiveness: formData.get("effectiveness"), accuracy: formData.get("accuracy"), usefulness: formData.get("usefulness"), wouldLearnAgain: formData.get("wouldLearnAgain") ?? "", feedback: formData.get("feedback") ?? "" });
  if (!parsed.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: tutorial } = await admin.from("tutorials").select("id,slug,tutor_id").eq("id", parsed.data.tutorialId).eq("status", "published").maybeSingle();
  if (!tutorial) redirect("/academy");
  const { data: progress } = await admin.from("tutorial_progress").select("completed_at").eq("learner_id", learnerId).eq("tutorial_id", tutorial.id).maybeSingle();
  if (!progress?.completed_at) redirect(`/academy/${tutorial.slug}?status=review-ineligible`);
  const { data: existing } = await admin.from("reviews").select("id").eq("learner_id", learnerId).eq("tutorial_id", tutorial.id).maybeSingle();
  const review = { tutor_id: tutorial.tutor_id, learner_id: learnerId, tutorial_id: tutorial.id, clarity_score: parsed.data.clarity, effectiveness_score: parsed.data.effectiveness, accuracy_score: parsed.data.accuracy, usefulness_score: parsed.data.usefulness, teaching_feedback: parsed.data.feedback || null, eligible_at: new Date().toISOString(), would_learn_again: parsed.data.wouldLearnAgain ? parsed.data.wouldLearnAgain === "yes" : null };
  const result = existing ? await admin.from("reviews").update(review).eq("id", existing.id) : await admin.from("reviews").insert(review);
  if (result.error) redirect(`/academy/${tutorial.slug}?status=error`);
  redirect(`/academy/${tutorial.slug}?status=review-saved`);
}

export async function registerForLiveClass(formData: FormData) {
  const id = idSchema.safeParse(formData.get("classId"));
  if (!id.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { error } = await admin.rpc("register_live_class", { p_learner_id: learnerId, p_live_class_id: id.data });
  redirect(`/academy?status=${error ? "class-unavailable" : "class-registered"}`);
}

export async function postTutorialComment(formData: FormData) {
  const parsed = z.object({ tutorialId: idSchema, body: z.string().trim().min(1).max(4000), parentCommentId: z.union([z.literal(""), idSchema]) }).safeParse({ tutorialId: formData.get("tutorialId"), body: formData.get("body"), parentCommentId: formData.get("parentCommentId") ?? "" });
  if (!parsed.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: tutorial } = await admin.from("tutorials").select("id,slug,status").eq("id", parsed.data.tutorialId).maybeSingle();
  if (!tutorial || tutorial.status !== "published") redirect("/academy");
  if (parsed.data.parentCommentId) {
    const { data: parent } = await admin.from("tutorial_comments").select("id,tutorial_id,status").eq("id", parsed.data.parentCommentId).maybeSingle();
    if (!parent || parent.tutorial_id !== tutorial.id || parent.status !== "visible") redirect(`/academy/${tutorial.slug}?status=comment-invalid`);
  }
  const { error } = await admin.from("tutorial_comments").insert({ tutorial_id: tutorial.id, author_id: learnerId, parent_comment_id: parsed.data.parentCommentId || null, body: parsed.data.body });
  redirect(`/academy/${tutorial.slug}?status=${error ? "error" : "comment-posted"}`);
}

export async function likeTutorialComment(formData: FormData) {
  const id = idSchema.safeParse(formData.get("commentId"));
  if (!id.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: comment } = await admin.from("tutorial_comments").select("id,tutorial_id,tutorials(slug)").eq("id", id.data).eq("status", "visible").maybeSingle();
  if (!comment) redirect("/academy");
  const { error } = await admin.from("tutorial_comment_likes").upsert({ comment_id: comment.id, user_id: learnerId }, { onConflict: "comment_id,user_id", ignoreDuplicates: true });
  const tutorial = Array.isArray(comment.tutorials) ? comment.tutorials[0] : comment.tutorials;
  redirect(`/academy/${tutorial?.slug ?? ""}?status=${error ? "error" : "comment-liked"}`);
}

export async function reportTutorialComment(formData: FormData) {
  const parsed = z.object({ commentId: idSchema, reason: z.string().trim().min(3).max(1000) }).safeParse({ commentId: formData.get("commentId"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: comment } = await admin.from("tutorial_comments").select("id,tutorial_id,tutorials(slug)").eq("id", parsed.data.commentId).eq("status", "visible").maybeSingle();
  if (!comment) redirect("/academy");
  const { error } = await admin.from("tutorial_comment_reports").insert({ comment_id: comment.id, reporter_id: learnerId, reason: parsed.data.reason });
  const tutorial = Array.isArray(comment.tutorials) ? comment.tutorials[0] : comment.tutorials;
  redirect(`/academy/${tutorial?.slug ?? ""}?status=${error ? "error" : "comment-reported"}`);
}

export async function respondToTutorialComment(formData: FormData) {
  const parsed = z.object({ tutorialId: idSchema, commentId: idSchema, body: z.string().trim().min(1).max(4000), pin: z.enum(["on", ""]) }).safeParse({ tutorialId: formData.get("tutorialId"), commentId: formData.get("commentId"), body: formData.get("body"), pin: formData.get("pin") ?? "" });
  if (!parsed.success) redirect("/academy");
  const { admin, learnerId } = await learnerContext();
  const { data: tutorial } = await admin.from("tutorials").select("id,slug,tutor_id").eq("id", parsed.data.tutorialId).eq("status", "published").maybeSingle();
  const { data: parent } = await admin.from("tutorial_comments").select("id,tutorial_id,status").eq("id", parsed.data.commentId).maybeSingle();
  if (!tutorial || tutorial.tutor_id !== learnerId || !parent || parent.tutorial_id !== tutorial.id || parent.status !== "visible") redirect("/academy");
  const { error: insertError } = await admin.from("tutorial_comments").insert({ tutorial_id: tutorial.id, author_id: learnerId, parent_comment_id: parent.id, tutor_response_to_id: parent.id, body: parsed.data.body });
  if (insertError) redirect(`/academy/${tutorial.slug}?status=error`);
  if (parsed.data.pin) await admin.from("tutorial_comments").update({ is_pinned: true }).eq("id", parent.id).eq("tutorial_id", tutorial.id);
  redirect(`/academy/${tutorial.slug}?status=comment-posted`);
}
