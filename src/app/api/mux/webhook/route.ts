import { NextResponse } from "next/server";
import { verifyMuxWebhook } from "@/lib/mux";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MuxEvent = { type?: string; data?: { id?: string; upload_id?: string; asset_id?: string; passthrough?: string; duration?: number; playback_ids?: Array<{ id: string }>; error?: { message?: string } } };

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyMuxWebhook(rawBody, request.headers.get("mux-signature"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const event = JSON.parse(rawBody) as MuxEvent;
  const asset = event.data;
  if (!asset) return NextResponse.json({ received: true });
  const admin = createSupabaseAdminClient();
  const uploadId = asset.upload_id ?? (event.type?.startsWith("video.upload.") ? asset.id : undefined);
  let tutorialId = asset.passthrough;
  if (uploadId && !tutorialId) {
    const { data } = await admin.from("tutorials").select("id").eq("video_upload_id", uploadId).maybeSingle();
    tutorialId = data?.id;
  }
  if (!tutorialId) return NextResponse.json({ received: true });
  if (event.type === "video.upload.asset_created" && asset.id) {
    await admin.from("tutorials").update({ video_asset_id: asset.asset_id ?? null, video_processing_status: "processing", status: "processing" }).eq("id", tutorialId).eq("video_provider", "mux").neq("video_processing_status", "ready");
  } else if (event.type === "video.asset.ready" && asset.id) {
    await admin.from("tutorials").update({ video_asset_id: asset.id, playback_id: asset.playback_ids?.[0]?.id ?? null, duration_seconds: Math.max(1, Math.floor(asset.duration ?? 1)), video_processing_status: "ready", status: "draft" }).eq("id", tutorialId).eq("video_provider", "mux");
  } else if (event.type === "video.asset.errored" || event.type === "video.upload.errored") {
    await admin.from("tutorials").update({ video_processing_status: "errored", status: "draft" }).eq("id", tutorialId).eq("video_provider", "mux").neq("video_processing_status", "ready");
  }
  return NextResponse.json({ received: true });
}
