import { randomBytes, randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { authenticatedAccount } from "@/lib/credentials/auth";
import { walletChallengeMessage } from "@/lib/credentials/wallet-challenge";

export async function POST(request: Request) {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });
  let wallet: PublicKey;
  try { wallet = new PublicKey((await request.json()).walletAddress); } catch { return Response.json({ error: "Wallet address is invalid." }, { status: 400 }); }
  const nonce = randomBytes(24).toString("base64url");
  const challengeId = randomUUID();
  const domain = new URL(request.url).host;
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  const expiresEpoch = Math.floor(expiresAt.getTime() / 1000);
  const message = walletChallengeMessage({ domain, walletAddress: wallet.toBase58(), nonce, challengeId, expiresEpoch });
  const db = context.admin as any;
  const { error } = await db.from("wallet_link_challenges").insert({ id: challengeId, user_id: context.account.id, wallet_address: wallet.toBase58(), nonce, expires_at: expiresAt.toISOString() });
  if (error) return Response.json({ error: "Could not create a wallet challenge." }, { status: 500 });
  return Response.json({ challengeId, message });
}
