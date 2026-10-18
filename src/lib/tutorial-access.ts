export type PublishedTutorialAccess = {
  status: string;
  isPublished: boolean;
  videoProcessingStatus: string;
  priceType: string;
  publicationNumber: number | null;
};

export type TutorialAccessRow = {
  id: string;
  tutorId?: string;
  status: string;
  isPublished: boolean;
  videoProcessingStatus: string;
  priceType: string;
  publicationNumber: number | null;
};

export function isTutorialPermanentlyFree(tutorial: Pick<PublishedTutorialAccess, "priceType" | "publicationNumber">) {
  return tutorial.priceType === "free" || tutorial.publicationNumber === 1 || tutorial.publicationNumber === 2;
}

export function isLearnerWatchableTutorial(tutorial: PublishedTutorialAccess) {
  return tutorial.status === "published"
    && tutorial.isPublished
    && tutorial.videoProcessingStatus === "ready"
    && isTutorialPermanentlyFree(tutorial);
}

export async function learnerHasTutorialAccess(admin: any, learnerId: string, tutorial: TutorialAccessRow) {
  if (tutorial.tutorId === learnerId) return true;
  if (isLearnerWatchableTutorial(tutorial)) return true;
  if (tutorial.status !== "published" || !tutorial.isPublished || tutorial.videoProcessingStatus !== "ready") return false;
  if (tutorial.priceType !== "premium") return false;
  const { data } = await admin.from("tutorial_entitlements").select("tutorial_id").eq("learner_id", learnerId).eq("tutorial_id", tutorial.id).maybeSingle();
  return Boolean(data);
}
