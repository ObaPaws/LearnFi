import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const apiBase = "https://api.mux.com/video/v1";

function muxCredentials() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) throw new Error("Mux server credentials are not configured.");
  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`;
}

export async function createMuxDirectUpload(tutorialId: string, origin: string) {
  const authorization = muxCredentials();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!appOrigin) throw new Error("Mux app origin is not configured.");
  const allowedOrigin = new URL(appOrigin).origin;
  if (new URL(origin).origin !== allowedOrigin) throw new Error("Upload origin is not allowed.");
  const response = await fetch(`${apiBase}/uploads`, {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({
      cors_origin: allowedOrigin,
      new_asset_settings: { playback_policies: ["public"], video_quality: "basic", passthrough: tutorialId },
      timeout: 3600,
    }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error("Mux could not create a direct upload.");
  return payload.data as { id: string; url: string; status: string };
}

export function verifyMuxWebhook(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const fields = signatureHeader.split(",").map((field) => field.trim().split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const supplied = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !supplied.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return supplied.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}
