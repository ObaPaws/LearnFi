import { NextResponse } from "next/server";
import { z } from "zod";
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
  const { data: account } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!account) return NextResponse.json({ error: "LearnFi profile not found." }, { status: 403 });
  const { data: tutorial } = await admin.from("tutorials").select("id,status,video_upload_id").eq("id", parsed.data.tutorialId).eq("tutor_id", account.id).maybeSingle();
  if (!tutorial) return NextResponse.json({ error: "You cannot upload to this tutorial." }, { status: 403 });
  if (tutorial.status === "published") return NextResponse.json({ error: "Published tutorials cannot replace their video." }, { status: 409 });
  try {
    const upload = await createMuxDirectUpload(tutorial.id, request.headers.get("origin") ?? new URL(request.url).origin);
    const { error } = await admin.from("tutorials").update({ video_provider: "mux", video_upload_id: upload.id, video_processing_status: "uploading", status: "uploading" }).eq("id", tutorial.id).eq("tutor_id", account.id);
    if (error) return NextResponse.json({ error: "The upload could not be attached to the tutorial." }, { status: 500 });
    return NextResponse.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("not configured") ? "Mux upload settings are not configured on the server." : "Mux could not create an upload. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
