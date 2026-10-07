import test from "node:test";
import assert from "node:assert/strict";
import { teachingCompatibility } from "../src/lib/matching.ts";
import { bayesianEducationalRating, educationalScore } from "../src/lib/ratings.ts";

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
