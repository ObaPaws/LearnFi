import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { authenticatedAccount } from "@/lib/credentials/auth";
import { verifyWalletChallenge, walletChallengeMessage } from "@/lib/credentials/wallet-challenge";

const schema = z.object({ challengeId: z.string().uuid(), walletAddress: z.string(), message: z.string(), signature: z.string() });

export async function POST(request: Request) {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid wallet verification request." }, { status: 400 });
  try {
    const address = new PublicKey(parsed.data.walletAddress);
    const db = context.admin as any;
    const { data: challenge } = await db.from("wallet_link_challenges").select("id,wallet_address,nonce,expires_at,consumed_at").eq("id", parsed.data.challengeId).eq("user_id", context.account.id).maybeSingle();
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.wallet_address !== address.toBase58()) return Response.json({ error: "Wallet challenge expired or does not match." }, { status: 400 });
    const domain = new URL(request.url).host;
    const expiresEpoch = Math.floor(new Date(challenge.expires_at).getTime() / 1000);
    const expectedMessage = walletChallengeMessage({ domain, walletAddress: address.toBase58(), nonce: challenge.nonce, challengeId: challenge.id, expiresEpoch });
    const ok = verifyWalletChallenge({ message: parsed.data.message, signatureBase64: parsed.data.signature, publicKey: address, expectedMessage });
    if (!ok) return Response.json({ error: "Wallet signature is invalid." }, { status: 400 });
    const { data: consumed, error: consumedError } = await db.from("wallet_link_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id).is("consumed_at", null).select("id").maybeSingle();
    if (consumedError || !consumed) return Response.json({ error: "Wallet challenge has already been used." }, { status: 400 });
    const { error } = await context.admin.from("users").update({ wallet_address: address.toBase58(), wallet_verified_at: new Date().toISOString() }).eq("id", context.account.id);
    if (error) return Response.json({ error: "That wallet is linked to another account." }, { status: 409 });
    return Response.json({ walletAddress: address.toBase58(), verified: true });
  } catch { return Response.json({ error: "Wallet could not be verified." }, { status: 400 }); }
}
