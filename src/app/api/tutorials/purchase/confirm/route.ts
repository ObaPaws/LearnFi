import { NextResponse } from "next/server";
import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ tutorialId: z.string().uuid(), signature: z.string().min(80).max(100) });
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const USDC_MINT = process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wT3Pcd9x8aK";

function associatedToken(owner: string) {
  return PublicKey.findProgramAddressSync([new PublicKey(owner).toBuffer(), TOKEN_PROGRAM.toBuffer(), new PublicKey(USDC_MINT).toBuffer()], ASSOCIATED_TOKEN_PROGRAM)[0].toBase58();
}

export async function POST(request: Request) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before confirming a purchase." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: learner } = await profileForAuthUser(admin, user.id, "id,wallet_address,wallet_verified_at");
  if (!learner?.wallet_address || !learner.wallet_verified_at) return NextResponse.json({ error: "Verify and link a wallet before purchasing." }, { status: 403 });
  const [{ data: tutorial }, { data: existing }] = await Promise.all([
    (admin as any).from("tutorials").select("id,tutor_id,status,is_published,video_processing_status,price_type,price_amount,video_provider,signed_playback_id,playback_id").eq("id", parsed.data.tutorialId).maybeSingle(),
    (admin as any).from("tutorial_entitlements").select("id").eq("learner_id", learner.id).eq("tutorial_id", parsed.data.tutorialId).maybeSingle(),
  ]);
  if (existing) return NextResponse.json({ unlocked: true });
  if (!tutorial || tutorial.status !== "published" || !tutorial.is_published || tutorial.video_processing_status !== "ready" || tutorial.price_type !== "premium" || !tutorial.price_amount) return NextResponse.json({ error: "This premium tutorial is not available for purchase." }, { status: 404 });
  if (tutorial.video_provider !== "mux" || !tutorial.signed_playback_id || tutorial.playback_id !== tutorial.signed_playback_id) return NextResponse.json({ error: "Secure video playback has not been prepared for this tutorial." }, { status: 409 });
  if (tutorial.tutor_id === learner.id) return NextResponse.json({ error: "Tutors cannot purchase their own tutorial." }, { status: 403 });
  const { data: tutor } = await admin.from("users").select("wallet_address,wallet_verified_at").eq("id", tutorial.tutor_id).maybeSingle();
  if (!tutor?.wallet_address || !tutor.wallet_verified_at || tutor.wallet_address === learner.wallet_address) return NextResponse.json({ error: "The tutor has no verified payout wallet available." }, { status: 409 });

  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
    if (await connection.getGenesisHash() !== DEVNET_GENESIS_HASH) return NextResponse.json({ error: "The configured Solana network is not available for tutorial payments." }, { status: 503 });
    const tx = await connection.getParsedTransaction(parsed.data.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!tx) return NextResponse.json({ error: "Payment is not confirmed yet. Try confirming again shortly." }, { status: 202 });
    if (tx.meta?.err) return NextResponse.json({ error: "The blockchain rejected this payment." }, { status: 400 });
    const payer = learner.wallet_address;
    const destination = associatedToken(tutor.wallet_address);
    const expectedAmount = BigInt(Math.round(Number(tutorial.price_amount) * 1_000_000)).toString();
    const signers = tx.transaction.message.accountKeys.filter((key) => key.signer).map((key) => key.pubkey.toBase58());
    const parsedInstructions = [
      ...tx.transaction.message.instructions,
      ...(tx.meta?.innerInstructions ?? []).flatMap((group) => group.instructions),
    ].filter((instruction: any) => "parsed" in instruction && instruction.program === "spl-token");
    const matched = parsedInstructions.some((instruction: any) => {
      const info = instruction.parsed?.info;
      return instruction.parsed?.type === "transferChecked" && info?.authority === payer && info?.destination === destination
        && info?.mint === USDC_MINT && String(info?.tokenAmount?.amount) === expectedAmount;
    });
    if (!signers.includes(payer) || !matched) return NextResponse.json({ error: "This confirmed transaction does not match the lesson price, USDC mint, learner wallet, and tutor payout wallet." }, { status: 400 });
    const { error } = await (admin as any).from("tutorial_entitlements").insert({ learner_id: learner.id, tutorial_id: tutorial.id, network: "solana-devnet", asset: "USDC", amount_base_units: expectedAmount, payer_wallet: payer, tutor_wallet: tutor.wallet_address, transaction_signature: parsed.data.signature });
    if (error) {
      const { data: raced } = await (admin as any).from("tutorial_entitlements").select("id").eq("learner_id", learner.id).eq("tutorial_id", tutorial.id).maybeSingle();
      if (!raced) return NextResponse.json({ error: "Payment was verified, but the lesson could not be unlocked. Contact support with your transaction signature." }, { status: 409 });
    }
    return NextResponse.json({ unlocked: true });
  } catch (error) {
    console.error("Tutorial payment verification failed", error);
    return NextResponse.json({ error: "Could not verify the transaction on Solana. Try again shortly." }, { status: 502 });
  }
}
