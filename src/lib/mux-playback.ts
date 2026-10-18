import "server-only";
import { createSign } from "node:crypto";
import { muxPlaybackSigningConfigured } from "./mux";

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function signMuxPlaybackToken(playbackId: string, durationSeconds: number, audience: "v" | "t" | "s" = "v") {
  if (!muxPlaybackSigningConfigured()) throw new Error("Mux signed playback keys are not configured.");
  const keyId = process.env.MUX_SIGNING_KEY_ID!;
  const privateKeyValue = process.env.MUX_SIGNING_PRIVATE_KEY!;
  const privateKey = privateKeyValue.includes("BEGIN PRIVATE KEY")
    ? privateKeyValue.replace(/\\n/g, "\n")
    : Buffer.from(privateKeyValue, "base64").toString("utf8");
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }));
  const expiresIn = Math.max(900, Math.ceil(durationSeconds) + 300);
  const payload = base64Url(JSON.stringify({ sub: playbackId, aud: audience, exp: Math.floor(Date.now() / 1000) + expiresIn, kid: keyId }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString("base64url")}`;
}
