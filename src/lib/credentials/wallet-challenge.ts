import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function walletChallengeMessage(input: { domain: string; walletAddress: string; nonce: string; challengeId: string; expiresEpoch: number }) {
  return `LearnFi wallet ownership verification\nDomain: ${input.domain}\nWallet: ${input.walletAddress}\nNonce: ${input.nonce}\nChallenge: ${input.challengeId}\nExpires: ${input.expiresEpoch}`;
}

export function verifyWalletChallenge(input: { message: string; signatureBase64: string; publicKey: PublicKey; expectedMessage: string }) {
  if (input.message !== input.expectedMessage) return false;
  try { return nacl.sign.detached.verify(new TextEncoder().encode(input.message), Buffer.from(input.signatureBase64, "base64"), input.publicKey.toBytes()); }
  catch { return false; }
}
