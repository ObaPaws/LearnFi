export type PublishedTutorialAccess = {
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
