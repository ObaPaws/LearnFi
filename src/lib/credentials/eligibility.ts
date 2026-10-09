import { ACHIEVEMENTS } from "./achievements.ts";

const tutorThreshold = Number(process.env.TUTOR_CREDENTIAL_MIN_RATING || "4.2");

export async function checkCredentialEligibility(admin: any, userId: string, type: "learner" | "tutor") {
  if (type === "learner") {
    const { data: tutorial } = await admin.from("tutorials").select("id,title").eq("slug", ACHIEVEMENTS.learner.slug).eq("status", "published").maybeSingle();
    if (!tutorial) return { eligible: false, reason: "The designated DeFi Fundamentals tutorial is not published." };
    const { data: progress } = await admin.from("tutorial_progress").select("completed_at,video_percent_watched,assessment_passed").eq("learner_id", userId).eq("tutorial_id", tutorial.id).maybeSingle();
    if (!isLearnerCredentialEligible({ completed: Boolean(progress?.completed_at), quizPassed: Boolean(progress?.assessment_passed), watchedPercent: Number(progress?.video_percent_watched ?? 0) })) {
      return { eligible: false, reason: "Complete at least 90% of DeFi Fundamentals and pass its quiz first." };
    }
    return { eligible: true, reason: "DeFi Fundamentals completed and quiz passed." };
  }

  const [{ data: entitlements }, { data: reputation }] = await Promise.all([
    admin.from("tutorial_free_entitlements").select("tutorial_id,tutorials!inner(status,price_type)").eq("tutor_id", userId),
    admin.from("tutor_reputation").select("eligible_review_count,adjusted_educational_rating").eq("tutor_id", userId).maybeSingle(),
  ]);
  const permanentlyFreePublished = (entitlements ?? []).filter((entry: any) => {
    const tutorial = Array.isArray(entry.tutorials) ? entry.tutorials[0] : entry.tutorials;
    return tutorial?.status === "published" && tutorial?.price_type === "free";
  }).length;
  if (!isTutorCredentialEligible({ freePublished: permanentlyFreePublished, eligibleReviews: Number(reputation?.eligible_review_count ?? 0), adjustedRating: Number(reputation?.adjusted_educational_rating ?? 0), ratingThreshold: tutorThreshold })) {
    if (permanentlyFreePublished < 2) return { eligible: false, reason: "Publish two permanently free tutorials first." };
    if (Number(reputation?.eligible_review_count ?? 0) < 5) return { eligible: false, reason: "Receive at least five eligible learner reviews first." };
    return { eligible: false, reason: `Meet the educational rating threshold of ${tutorThreshold.toFixed(2)} first.` };
  }
  return { eligible: true, reason: "Tutor publication, review, and rating requirements are met." };
}

export function tutorCredentialRatingThreshold() { return tutorThreshold; }
export function isLearnerCredentialEligible(input: { completed: boolean; quizPassed: boolean; watchedPercent: number }) {
  return input.completed && input.quizPassed && input.watchedPercent >= 90;
}
export function isTutorCredentialEligible(input: { freePublished: number; eligibleReviews: number; adjustedRating: number; ratingThreshold: number }) {
  return input.freePublished >= 2 && input.eligibleReviews >= 5 && input.adjustedRating >= input.ratingThreshold;
}
