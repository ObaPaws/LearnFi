import { z } from "zod";

/** External X user ID is immutable; usernames are mutable display handles. */
export const learnFiUsernameSchema = z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, or underscores.");

export function usernameFromXHandle(handle: string): string {
  const normalized = handle.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  return normalized.length >= 3 ? normalized : `learner_${normalized || "new"}`;
}

export function isSafePostAuthPath(value: string) {
  return /^\/tutorials\/(?:demo\/[a-z0-9-]+|[0-9a-f-]{36})$/i.test(value) || /^\/academy\/[a-z0-9][a-z0-9-]{0,178}$/i.test(value);
}
