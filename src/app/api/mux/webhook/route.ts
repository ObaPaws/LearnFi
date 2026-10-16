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
  const isUploadCreated = event.type === "video.upload.asset_created";
  const isAssetReady = event.type === "video.asset.ready";
  const isErrored = event.type === "video.asset.errored" || event.type === "video.upload.errored";
  if (!tutorialId) {
    return isUploadCreated || isAssetReady || isErrored
      ? NextResponse.json({ error: "No LearnFi tutorial matches this Mux event." }, { status: 500 })
      : NextResponse.json({ received: true });
  }
  if (isUploadCreated && asset.asset_id) {
    const { error } = await admin.from("tutorials").update({ video_asset_id: asset.asset_id, video_processing_status: "processing", status: "processing" }).eq("id", tutorialId).eq("video_provider", "mux").neq("video_processing_status", "ready");
    if (error) return NextResponse.json({ error: "Could not record the Mux asset." }, { status: 500 });
  } else if (isAssetReady && asset.id && asset.playback_ids?.[0]?.id) {
    const { data, error } = await admin.from("tutorials").update({ video_asset_id: asset.id, playback_id: asset.playback_ids[0].id, duration_seconds: Math.max(1, Math.floor(asset.duration ?? 1)), video_processing_status: "ready", status: "draft" }).eq("id", tutorialId).eq("video_provider", "mux").select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Could not record the ready Mux video." }, { status: 500 });
  } else if (isErrored) {
    const { error } = await admin.from("tutorials").update({ video_processing_status: "errored", status: "draft" }).eq("id", tutorialId).eq("video_provider", "mux").neq("video_processing_status", "ready");
    if (error) return NextResponse.json({ error: "Could not record the Mux processing error." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
