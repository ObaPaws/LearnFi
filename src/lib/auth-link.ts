import { createHmac, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export type WalletXLinkIntent = { authUserId: string; walletAddress: string; expiresAt: number };

export function walletAddressFromWeb3Identity(user: { identities?: Array<{ provider: string; id: string; identity_data?: Record<string, unknown> | null }> }) {
  const identity = user.identities?.find((item) => item.provider === "web3" || item.provider === "solana");
  if (!identity) return null;
  const identityData = identity.identity_data ?? {};
  const candidates = [identityData.sub, identityData.address, identityData.wallet_address, identity.id];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    try { return new PublicKey(candidate).toBase58(); } catch { /* try the next identity field */ }
  }
  return null;
}

export function createWalletXLinkToken(intent: WalletXLinkIntent, secret: string) {
  const payload = Buffer.from(JSON.stringify(intent)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readWalletXLinkToken(token: string, secret: string, now = Date.now()): WalletXLinkIntent | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64url"); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const intent = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WalletXLinkIntent;
    if (!/^[0-9a-f-]{36}$/i.test(intent.authUserId) || !Number.isFinite(intent.expiresAt) || intent.expiresAt <= now) return null;
    const walletAddress = new PublicKey(intent.walletAddress).toBase58();
    if (walletAddress !== intent.walletAddress) return null;
    return intent;
  } catch { return null; }
}