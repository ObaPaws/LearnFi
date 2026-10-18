import { NextResponse } from "next/server";
import { z } from "zod";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createMuxSignedPlaybackId, deleteMuxPlaybackId, muxPlaybackSigningConfigured } from "@/lib/mux";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ tutorialId: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before purchasing." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid tutorial." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: learner } = await profileForAuthUser(admin, user.id, "id,wallet_address,wallet_verified_at");
  if (!learner?.wallet_address || !learner.wallet_verified_at) return NextResponse.json({ error: "Verify and link a wallet before purchasing." }, { status: 403 });
  const [{ data: tutorial }, { data: entitlement }] = await Promise.all([
    (admin as any).from("tutorials").select("id,tutor_id,status,is_published,video_processing_status,price_type,video_provider,video_asset_id,playback_id,signed_playback_id").eq("id", parsed.data.tutorialId).maybeSingle(),
    (admin as any).from("tutorial_entitlements").select("id").eq("learner_id", learner.id).eq("tutorial_id", parsed.data.tutorialId).maybeSingle(),
  ]);
  if (!tutorial || tutorial.status !== "published" || !tutorial.is_published || tutorial.video_processing_status !== "ready" || tutorial.price_type !== "premium" || tutorial.video_provider !== "mux" || !tutorial.video_asset_id) return NextResponse.json({ error: "This premium tutorial is not available for purchase." }, { status: 404 });
  if (tutorial.tutor_id === learner.id) return NextResponse.json({ error: "Tutors cannot purchase their own tutorial." }, { status: 403 });
  if (!entitlement) {
    const { data: tutor } = await admin.from("users").select("wallet_address,wallet_verified_at").eq("id", tutorial.tutor_id).maybeSingle();
    if (!tutor?.wallet_address || !tutor.wallet_verified_at || tutor.wallet_address === learner.wallet_address) return NextResponse.json({ error: "The tutor has no verified payout wallet available." }, { status: 409 });
  }
  if (!muxPlaybackSigningConfigured()) return NextResponse.json({ error: "Secure video playback is not configured, so payment cannot be accepted yet." }, { status: 503 });

  try {
    const signedPlaybackId = tutorial.signed_playback_id || await createMuxSignedPlaybackId(tutorial.video_asset_id);
    const publicPlaybackId = tutorial.playback_id;
    if (publicPlaybackId !== signedPlaybackId) {
      const { error } = await (admin as any).from("tutorials").update({ playback_id: signedPlaybackId, signed_playback_id: signedPlaybackId }).eq("id", tutorial.id);
      if (error) return NextResponse.json({ error: "Could not prepare secure lesson playback." }, { status: 500 });
      if (publicPlaybackId) await deleteMuxPlaybackId(tutorial.video_asset_id, publicPlaybackId);
    }
    return NextResponse.json({ prepared: true });
  } catch (error) {
    console.error("Could not prepare signed playback for tutorial purchase.", error);
    return NextResponse.json({ error: "Could not secure this tutorial for paid playback. No payment was sent." }, { status: 503 });
  }
}
