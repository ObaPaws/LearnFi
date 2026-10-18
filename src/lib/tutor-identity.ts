import { PublicKey } from "@solana/web3.js";
import type { Database } from "@/lib/database.types";

export type TutorIdentity = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "x_user_id" | "wallet_address" | "wallet_verified_at"
>;

export function isWalletIdentityVerified(identity: Pick<TutorIdentity, "wallet_address" | "wallet_verified_at"> | null | undefined): boolean {
  if (!identity?.wallet_address || !identity.wallet_verified_at || !Number.isFinite(Date.parse(identity.wallet_verified_at))) return false;
  try {
    return new PublicKey(identity.wallet_address).toBase58() === identity.wallet_address;
  } catch {
    return false;
  }
}

export function isTutorDevBypassEnabled(authUserId: string | null | undefined): boolean {
  if (!authUserId) return false;
  const allowedUserIds = process.env.TUTOR_DEV_BYPASS_USER_IDS?.split(/[\s,]+/).filter(Boolean) ?? [];
  return allowedUserIds.includes(authUserId);
}

export function isTutorIdentityComplete(identity: TutorIdentity | null | undefined, authUserId?: string | null): boolean {
  return isTutorDevBypassEnabled(authUserId) || Boolean(identity?.x_user_id.trim() && isWalletIdentityVerified(identity));
}
