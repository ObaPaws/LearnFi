import { createHash } from "node:crypto";

export const ACHIEVEMENTS = {
  learner: { slug: "defi-fundamentals", id: createHash("sha256").update("learnfi:achievement:defi-fundamentals:v1").digest() },
  tutor: { slug: "free-tutor", id: createHash("sha256").update("learnfi:achievement:free-tutor:v1").digest() },
} as const;
