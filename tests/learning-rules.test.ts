import test from "node:test";
import assert from "node:assert/strict";
import { teachingCompatibility } from "../src/lib/matching.ts";
import { bayesianEducationalRating, educationalScore } from "../src/lib/ratings.ts";
import { isLearnerWatchableTutorial, isTutorialPermanentlyFree } from "../src/lib/tutorial-access.ts";

test("teaching compatibility uses weighted overlap and returns an explainable percentage", () => {
  assert.equal(teachingCompatibility([{ id: "project", weight: 3 }, { id: "visual", weight: 1 }], ["project"]), 75);
  assert.equal(teachingCompatibility([], ["project"]), null);
  assert.equal(teachingCompatibility([{ id: "project", weight: 0 }], ["project"]), null);
});

test("educational rating applies the published score weights", () => {
  assert.equal(educationalScore({ clarity: 5, effectiveness: 4, accuracy: 3, usefulness: 2 }), 3.75);
  assert.throws(() => educationalScore({ clarity: 6, effectiveness: 4, accuracy: 3, usefulness: 2 }), RangeError);
});

test("Bayesian tutor rating moderates small samples and converges as evidence grows", () => {
  assert.equal(bayesianEducationalRating([5]), 3.96);
  assert.equal(bayesianEducationalRating([5, 5, 5, 5, 5]), 4.38);
  assert.equal(bayesianEducationalRating([], 3.75, 0), null);
  assert.throws(() => bayesianEducationalRating([0]), RangeError);
});

test("publication slots one and two stay free, including when a publication is later removed", () => {
  assert.equal(isTutorialPermanentlyFree({ publicationNumber: 1, priceType: "premium" }), true);
  assert.equal(isTutorialPermanentlyFree({ publicationNumber: 2, priceType: "premium" }), true);
  assert.equal(isTutorialPermanentlyFree({ publicationNumber: 3, priceType: "premium" }), false);
  assert.equal(isTutorialPermanentlyFree({ publicationNumber: 3, priceType: "free" }), true);
});

test("learners can watch only published, ready, free lessons", () => {
  const base = { status: "published", isPublished: true, videoProcessingStatus: "ready", priceType: "free", publicationNumber: 3 };
  assert.equal(isLearnerWatchableTutorial(base), true);
  assert.equal(isLearnerWatchableTutorial({ ...base, priceType: "premium" }), false);
  assert.equal(isLearnerWatchableTutorial({ ...base, isPublished: false }), false);
  assert.equal(isLearnerWatchableTutorial({ ...base, videoProcessingStatus: "processing" }), false);
});
