import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { createWalletXLinkToken, readWalletXLinkToken, walletAddressFromWeb3Identity } from "../src/lib/auth-link.ts";
import { isLearnerCredentialEligible, isTutorCredentialEligible } from "../src/lib/credentials/eligibility.ts";
import { isCredentialActive } from "../src/lib/credentials/status.ts";
import { isTutorIdentityComplete } from "../src/lib/tutor-identity.ts";
import { verifyWalletChallenge, walletChallengeMessage } from "../src/lib/credentials/wallet-challenge.ts";

test("learner eligibility is derived from completion, passed quiz, and watch threshold", () => {
  assert.equal(isLearnerCredentialEligible({ completed: true, quizPassed: true, watchedPercent: 90 }), true);
  assert.equal(isLearnerCredentialEligible({ completed: false, quizPassed: true, watchedPercent: 100 }), false);
  assert.equal(isLearnerCredentialEligible({ completed: true, quizPassed: false, watchedPercent: 100 }), false);
  assert.equal(isLearnerCredentialEligible({ completed: true, quizPassed: true, watchedPercent: 89.99 }), false);
});

test("tutor eligibility requires every configured threshold", () => {
  const eligible = { freePublished: 2, eligibleReviews: 5, adjustedRating: 4.2, ratingThreshold: 4.2 };
  assert.equal(isTutorCredentialEligible(eligible), true);
  assert.equal(isTutorCredentialEligible({ ...eligible, freePublished: 1 }), false);
  assert.equal(isTutorCredentialEligible({ ...eligible, eligibleReviews: 4 }), false);
  assert.equal(isTutorCredentialEligible({ ...eligible, adjustedRating: 4.19 }), false);
});

test("application verification excludes revoked credentials and credentials for another wallet", () => {
  const recipient = Keypair.generate().publicKey.toBase58();
  const otherRecipient = Keypair.generate().publicKey.toBase58();
  assert.equal(isCredentialActive({ recipient, revoked: false }, recipient), true);
  assert.equal(isCredentialActive({ recipient, revoked: true }, recipient), false);
  assert.equal(isCredentialActive({ recipient, revoked: false }, otherRecipient), false);
  assert.equal(isCredentialActive({ recipient, revoked: false }, null), false);
});

test("wallet ownership challenge accepts only the connected wallet's exact signed challenge", () => {
  const wallet = Keypair.generate();
  const input = { domain: "learnfi.example", walletAddress: wallet.publicKey.toBase58(), nonce: "single-use-nonce", challengeId: "test-challenge", expiresEpoch: 1_800_000_000 };
  const message = walletChallengeMessage(input);
  const signature = nacl.sign.detached(new TextEncoder().encode(message), wallet.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");
  assert.equal(verifyWalletChallenge({ message, signatureBase64, publicKey: wallet.publicKey, expectedMessage: message }), true);
  assert.equal(verifyWalletChallenge({ message: `${message}!`, signatureBase64, publicKey: wallet.publicKey, expectedMessage: message }), false);
  const otherWallet = Keypair.generate();
  assert.equal(verifyWalletChallenge({ message, signatureBase64, publicKey: otherWallet.publicKey, expectedMessage: message }), false);
});

test("wallet Auth identities require an unexpired untampered X-link intent", () => {
  const secret = "integration-test-secret";
  const intent = { authUserId: "11111111-1111-4111-8111-111111111111", walletAddress: Keypair.generate().publicKey.toBase58(), expiresAt: 2_000 };
  const token = createWalletXLinkToken(intent, secret);
  assert.deepEqual(readWalletXLinkToken(token, secret, 1_000), intent);
  assert.equal(readWalletXLinkToken(token, secret, 2_000), null);
  const [payload, signature] = token.split(".");
  const changedSignature = `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`;
  assert.equal(readWalletXLinkToken(`${payload}.${changedSignature}`, secret, 1_000), null);
});

test("Supabase Solana identity exposes only a valid wallet address", () => {
  const address = Keypair.generate().publicKey.toBase58();
  assert.equal(walletAddressFromWeb3Identity({ identities: [{ provider: "web3", id: address, identity_data: { sub: address } }] }), address);
  assert.equal(walletAddressFromWeb3Identity({ identities: [{ provider: "x", id: "x-user" }] }), null);
});

test("tutor registration requires X, verified wallet, and confirmed email", () => {
  const complete = { xUserId: "x-123", walletAddress: "wallet", walletVerifiedAt: "2026-10-09T00:00:00Z", verifiedEmail: "tutor@example.com", emailVerifiedAt: "2026-10-09T00:00:00Z" };
  assert.equal(isTutorIdentityComplete(complete), true);
  for (const field of Object.keys(complete) as Array<keyof typeof complete>) {
    assert.equal(isTutorIdentityComplete({ ...complete, [field]: null }), false);
  }
});
