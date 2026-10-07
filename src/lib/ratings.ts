export type EducationalScores = {
  clarity: number;
  effectiveness: number;
  accuracy: number;
  usefulness: number;
};

export function educationalScore(scores: EducationalScores): number {
  const values = [scores.clarity, scores.effectiveness, scores.accuracy, scores.usefulness];
  if (values.some((score) => !Number.isFinite(score) || score < 1 || score > 5)) {
    throw new RangeError("Educational review scores must be between 1 and 5.");
  }
  return Math.round((scores.clarity * 0.3 + scores.effectiveness * 0.3 + scores.accuracy * 0.25 + scores.usefulness * 0.15) * 100) / 100;
}

export function bayesianEducationalRating(scores: number[], priorMean = 3.75, priorReviewWeight = 5): number | null {
  if (!Number.isFinite(priorMean) || priorMean < 1 || priorMean > 5 || !Number.isFinite(priorReviewWeight) || priorReviewWeight < 0) {
    throw new RangeError("Rating prior is outside supported bounds.");
  }
  if (scores.some((score) => !Number.isFinite(score) || score < 1 || score > 5)) {
    throw new RangeError("Educational ratings must be between 1 and 5.");
  }
  const denominator = priorReviewWeight + scores.length;
  if (denominator === 0) return null;
  const adjusted = (priorMean * priorReviewWeight + scores.reduce((sum, score) => sum + score, 0)) / denominator;
  return Math.round(adjusted * 100) / 100;
}
