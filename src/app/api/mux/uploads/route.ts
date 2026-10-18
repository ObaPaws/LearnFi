import { NextResponse } from "next/server";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createMuxDirectUpload } from "@/lib/mux";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ tutorialId: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a tutorial." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid tutorial draft." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: account } = await profileForAuthUser(admin, user.id, "id");
  if (!account) return NextResponse.json({ error: "LearnFi profile not found." }, { status: 403 });
  const { data: tutorial } = await admin.from("tutorials").select("id,status,is_published,video_upload_id").eq("id", parsed.data.tutorialId).eq("tutor_id", account.id).maybeSingle();
  if (!tutorial) return NextResponse.json({ error: "You cannot upload to this tutorial." }, { status: 403 });
  try {
    const upload = await createMuxDirectUpload(tutorial.id, request.headers.get("origin") ?? new URL(request.url).origin);
    const update = tutorial.is_published || tutorial.status === "published"
      ? await (admin as any).from("tutorials").update({ video_provider: "mux", video_upload_id: upload.id, video_replacement_pending: true }).eq("id", tutorial.id).eq("tutor_id", account.id)
      : await admin.from("tutorials").update({ video_provider: "mux", video_upload_id: upload.id, video_processing_status: "uploading", status: "uploading" }).eq("id", tutorial.id).eq("tutor_id", account.id);
    const { error } = update;
    if (error) return NextResponse.json({ error: "The upload could not be attached to the tutorial." }, { status: 500 });
    return NextResponse.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Mux upload error.";
    console.error("Could not create a Mux direct upload.", errorMessage);
    const message = errorMessage.includes("not configured")
      ? "Mux upload settings are not configured on the server."
      : errorMessage.includes("origin is not allowed")
        ? "This site is not allowed to create Mux uploads. Check the deployed app URL configuration."
        : "Mux could not create an upload. Check the server logs for the provider response.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
