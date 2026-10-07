import { notFound, redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function LegacyTutorialRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: tutorial } = await db.from("tutorials").select("slug").eq("id", id).maybeSingle();
  if (!tutorial) notFound();
  redirect(`/academy/${encodeURIComponent(tutorial.slug)}`);
}
