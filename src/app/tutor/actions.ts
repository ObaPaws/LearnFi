"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signedInUser() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: account } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!account) redirect("/auth/sign-in");
  return { admin, userId: account.id };
}

const profileSchema = z.object({
  headline: z.string().trim().max(100),
  bio: z.string().trim().max(3000),
  technicalBackground: z.string().trim().max(3000),
  styleIds: z.array(z.string().uuid()).max(12),
  subjectIds: z.array(z.string().uuid()).max(10),
});

export async function saveTutorProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
    technicalBackground: formData.get("technicalBackground") ?? "",
    styleIds: formData.getAll("styleIds"),
    subjectIds: formData.getAll("subjectIds"),
  });
  if (!parsed.success) redirect("/tutor?status=invalid");
  const { admin, userId } = await signedInUser();
  const { error: profileError } = await admin.from("tutor_profiles").upsert({ user_id: userId, headline: parsed.data.headline || null, bio: parsed.data.bio || null, technical_background: parsed.data.technicalBackground || null, is_published: false }, { onConflict: "user_id" });
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
  summary: z.string().trim().max(500),
  contentUrl: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://"))]),
  subjectId: z.union([z.literal(""), z.string().uuid()]),
});

export async function createTutorial(formData: FormData) {
  const parsed = tutorialSchema.safeParse({ title: formData.get("title") ?? "", summary: formData.get("summary") ?? "", contentUrl: formData.get("contentUrl") ?? "", subjectId: formData.get("subjectId") ?? "" });
  if (!parsed.success) redirect("/tutor?status=invalid");
  const { admin, userId } = await signedInUser();
  const { data: tutor } = await admin.from("tutor_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!tutor) redirect("/tutor?status=setup");
  const { data: previous } = await admin.from("tutorials").select("position").eq("tutor_id", userId).order("position", { ascending: false }).limit(1).maybeSingle();
  const position = (previous?.position ?? 0) + 1;
  const slugBase = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "tutorial";
  const { error } = await admin.from("tutorials").insert({ tutor_id: userId, subject_id: parsed.data.subjectId || null, title: parsed.data.title, slug: `${slugBase}-${position}`, summary: parsed.data.summary || null, content_url: parsed.data.contentUrl || null, position });
  redirect(error ? "/tutor?status=error" : "/tutor?status=tutorial-created");
}

export async function publishTutorial(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("tutorialId"));
  if (!id.success) redirect("/tutor?status=error");
  const { admin, userId } = await signedInUser();
  const { data: tutorial } = await admin.from("tutorials").select("id,content_url").eq("id", id.data).eq("tutor_id", userId).maybeSingle();
  if (!tutorial) redirect("/tutor?status=error");
  if (!tutorial.content_url || !tutorial.content_url.startsWith("https://")) redirect("/tutor?status=content-required");
  const { error } = await admin.from("tutorials").update({ is_published: true }).eq("id", tutorial.id).eq("tutor_id", userId);
  redirect(error ? "/tutor?status=error" : "/tutor?status=tutorial-published");
}
