"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTutorIdentityComplete } from "@/lib/tutor-identity";

async function signedInUser() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: account } = await profileForAuthUser(admin, user.id, "id,x_user_id,wallet_address,wallet_verified_at,verified_email,email_verified_at");
  if (!account) redirect("/auth/sign-in");
  if (!isTutorIdentityComplete(account)) redirect("/profile?status=tutor-requirements");
  return { admin, userId: account.id };
}

const profileSchema = z.object({
  headline: z.string().trim().max(100),
  bio: z.string().trim().max(3000),
  technicalBackground: z.string().trim().max(3000),
  styleIds: z.array(z.string().uuid()).max(12),
  subjectIds: z.array(z.string().uuid()).max(10),
  website: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://"))]),
  xProfile: z.union([z.literal(""), z.string().url().refine((value) => /^https:\/\/(www\.)?(x\.com|twitter\.com)\//i.test(value))]),
  expertise: z.string().trim().max(1000),
});

export async function saveTutorProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
    technicalBackground: formData.get("technicalBackground") ?? "",
    styleIds: formData.getAll("styleIds"),
    subjectIds: formData.getAll("subjectIds"),
    website: formData.get("website") ?? "",
    xProfile: formData.get("xProfile") ?? "",
    expertise: formData.get("expertise") ?? "",
  });
  if (!parsed.success) redirect("/tutor?status=invalid");
  const { admin, userId } = await signedInUser();
  const areasOfExpertise = parsed.data.expertise.split(",").map((area) => area.trim()).filter(Boolean).slice(0, 12);
  const { error: profileError } = await admin.from("tutor_profiles").upsert({ user_id: userId, headline: parsed.data.headline || null, bio: parsed.data.bio || null, technical_background: parsed.data.technicalBackground || null, website_url: parsed.data.website || null, x_profile_url: parsed.data.xProfile || null, areas_of_expertise: areasOfExpertise, is_published: false }, { onConflict: "user_id" });
  if (profileError) redirect("/tutor?status=error");
  const { error: roleError } = await admin.from("user_roles").upsert({ user_id: userId, role: "tutor" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleError) redirect("/tutor?status=error");
  const { error: deleteStylesError } = await admin.from("tutor_teaching_styles").delete().eq("tutor_id", userId);
  const { error: deleteSubjectsError } = await admin.from("tutor_subjects").delete().eq("tutor_id", userId);
  if (deleteStylesError || deleteSubjectsError) redirect("/tutor?status=error");
  if (parsed.data.styleIds.length) {
    const { error } = await admin.from("tutor_teaching_styles").insert(parsed.data.styleIds.map((style_id) => ({ tutor_id: userId, style_id })));
    if (error) redirect("/tutor?status=error");
  }
  if (parsed.data.subjectIds.length) {
    const { error } = await admin.from("tutor_subjects").insert(parsed.data.subjectIds.map((subject_id) => ({ tutor_id: userId, subject_id })));
    if (error) redirect("/tutor?status=error");
  }
  redirect("/tutor?status=saved");
}

export async function publishTutorProfile() {
  const { admin, userId } = await signedInUser();
  const [{ count: styleCount }, { count: subjectCount }, { data: profile }] = await Promise.all([
    admin.from("tutor_teaching_styles").select("style_id", { count: "exact", head: true }).eq("tutor_id", userId),
    admin.from("tutor_subjects").select("subject_id", { count: "exact", head: true }).eq("tutor_id", userId),
    admin.from("tutor_profiles").select("headline,bio").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile?.headline || !profile.bio || !styleCount || !subjectCount) redirect("/tutor?status=incomplete");
  const { error } = await admin.from("tutor_profiles").update({ is_published: true }).eq("user_id", userId);
  redirect(error ? "/tutor?status=error" : "/tutor?status=published");
}

const tutorialSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(4000),
  subjectId: z.union([z.literal(""), z.string().uuid()]),
  categoryId: z.union([z.literal(""), z.string().uuid()]),
  subcategory: z.string().trim().max(100),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

export async function createTutorial(formData: FormData) {
  const parsed = tutorialSchema.safeParse({ title: formData.get("title") ?? "", description: formData.get("description") ?? "", subjectId: formData.get("subjectId") ?? "", categoryId: formData.get("categoryId") ?? "", subcategory: formData.get("subcategory") ?? "", difficulty: formData.get("difficulty") ?? "beginner" });
  if (!parsed.success) redirect("/tutor?status=invalid");
  const { admin, userId } = await signedInUser();
  const { data: tutor } = await admin.from("tutor_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!tutor) redirect("/tutor?status=setup");
  const { data: previous } = await admin.from("tutorials").select("position").eq("tutor_id", userId).order("position", { ascending: false }).limit(1).maybeSingle();
  const position = (previous?.position ?? 0) + 1;
  const slugBase = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "tutorial";
  const { error } = await admin.from("tutorials").insert({ tutor_id: userId, subject_id: parsed.data.subjectId || null, category_id: parsed.data.categoryId || null, subcategory: parsed.data.subcategory || null, difficulty: parsed.data.difficulty, title: parsed.data.title, slug: `${slugBase}-${position}`, summary: parsed.data.description || null, description: parsed.data.description || null, position });
  redirect(error ? "/tutor?status=error" : "/tutor?status=tutorial-created");
}

export async function publishTutorial(formData: FormData) {
  const parsed = z.object({ tutorialId: z.string().uuid(), priceType: z.enum(["free", "premium"]), priceAmount: z.coerce.number().positive().max(100000).optional() }).safeParse({ tutorialId: formData.get("tutorialId"), priceType: formData.get("priceType") ?? "free", priceAmount: formData.get("priceAmount") || undefined });
  if (!parsed.success || (parsed.data.priceType === "premium" && !parsed.data.priceAmount)) redirect("/tutor?status=invalid");
  const { admin, userId } = await signedInUser();
  const { data: tutorial } = await admin.from("tutorials").select("id,video_provider,video_processing_status").eq("id", parsed.data.tutorialId).eq("tutor_id", userId).maybeSingle();
  if (!tutorial) redirect("/tutor?status=error");
  if (tutorial.video_processing_status !== "ready") redirect("/tutor?status=video-required");
  const { error } = await admin.rpc("publish_tutorial", { p_tutor_id: userId, p_tutorial_id: tutorial.id, p_price_type: parsed.data.priceType, p_price_amount: parsed.data.priceAmount ?? undefined });
  redirect(error ? "/tutor?status=error" : "/tutor?status=tutorial-published");
}

export async function scheduleLiveClass(formData: FormData) {
  const parsed = z.object({ title: z.string().trim().min(3).max(160), description: z.string().trim().min(1).max(4000), startsAt: z.string().min(1), duration: z.coerce.number().int().min(10).max(480), categoryId: z.union([z.literal(""), z.string().uuid()]), meetingUrl: z.string().url().refine((value) => value.startsWith("https://")), capacity: z.union([z.literal(""), z.coerce.number().int().positive().max(100000)]) }).safeParse({ title: formData.get("title"), description: formData.get("description"), startsAt: formData.get("startsAt"), duration: formData.get("duration"), categoryId: formData.get("categoryId") ?? "", meetingUrl: formData.get("meetingUrl"), capacity: formData.get("capacity") ?? "" });
  const startsAt = parsed.success ? new Date(parsed.data.startsAt) : null;
  if (!parsed.success || !startsAt || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) redirect("/tutor?status=class-invalid");
  const { admin, userId } = await signedInUser();
  const { data: profile } = await admin.from("tutor_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) redirect("/tutor?status=setup");
  const { error } = await admin.from("live_classes").insert({ tutor_id: userId, title: parsed.data.title, description: parsed.data.description, starts_at: startsAt.toISOString(), duration_minutes: parsed.data.duration, category_id: parsed.data.categoryId || null, meeting_url: parsed.data.meetingUrl, capacity: parsed.data.capacity === "" ? null : parsed.data.capacity });
  redirect(error ? "/tutor?status=error" : "/tutor?status=class-scheduled");
}

export async function saveTutorialQuiz(formData: FormData) {
  const questionRows = z.array(z.object({ prompt: z.string().trim().min(5).max(1000), options: z.array(z.string().trim().min(1).max(500)).min(2).max(4), correctOption: z.number().int().min(0).max(3), explanation: z.string().trim().max(2000) })).min(1).max(20);
  let questions: unknown;
  try { questions = JSON.parse(String(formData.get("questionsJson") ?? "[]")); } catch { redirect("/tutor?status=quiz-invalid"); }
  const parsed = z.object({ tutorialId: z.string().uuid(), title: z.string().trim().min(3).max(160), passingScore: z.coerce.number().int().min(1).max(100), questions: questionRows }).safeParse({ tutorialId: formData.get("tutorialId"), title: formData.get("quizTitle"), passingScore: formData.get("passingScore") ?? 70, questions });
  if (!parsed.success) redirect("/tutor?status=quiz-invalid");
  if (parsed.data.questions.some((question) => question.correctOption >= question.options.length)) redirect("/tutor?status=quiz-invalid");
  const { admin, userId } = await signedInUser();
  const { data: tutorial } = await admin.from("tutorials").select("id").eq("id", parsed.data.tutorialId).eq("tutor_id", userId).maybeSingle();
  if (!tutorial) redirect("/tutor?status=error");
  let { data: quiz } = await admin.from("quizzes").select("id").eq("tutorial_id", tutorial.id).order("created_at").limit(1).maybeSingle();
  if (quiz) {
    const { count: attemptCount } = await admin.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", quiz.id);
    if ((attemptCount ?? 0) > 0) redirect("/tutor?status=quiz-frozen");
    const { error: updateError } = await admin.from("quizzes").update({ title: parsed.data.title, passing_score: parsed.data.passingScore }).eq("id", quiz.id);
    const { error: deleteError } = await admin.from("tutorial_quiz_questions").delete().eq("quiz_id", quiz.id);
    if (updateError || deleteError) redirect("/tutor?status=error");
  } else {
    const { data, error } = await admin.from("quizzes").insert({ tutorial_id: tutorial.id, title: parsed.data.title, passing_score: parsed.data.passingScore }).select("id").single();
    if (error || !data) redirect("/tutor?status=error");
    quiz = data;
  }
  for (const [questionIndex, row] of parsed.data.questions.entries()) {
    const { data: question, error: questionError } = await admin.from("tutorial_quiz_questions").insert({ quiz_id: quiz.id, prompt: row.prompt, position: questionIndex + 1 }).select("id").single();
    if (questionError || !question) redirect("/tutor?status=error");
    const { data: insertedOptions, error: optionsError } = await admin.from("tutorial_quiz_options").insert(row.options.map((option, index) => ({ question_id: question.id, option_text: option, position: index + 1 }))).select("id,position");
    if (optionsError || !insertedOptions) redirect("/tutor?status=error");
    const correctOption = insertedOptions.find((option) => option.position === row.correctOption + 1);
    if (!correctOption) redirect("/tutor?status=error");
    const { error: answerError } = await admin.from("tutorial_quiz_answers").insert({ question_id: question.id, correct_option_id: correctOption.id, explanation: row.explanation || null });
    if (answerError) redirect("/tutor?status=error");
  }
  redirect("/tutor?status=quiz-saved");
}
