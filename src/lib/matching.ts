export type TeachingStyle = { id: string; name: string };

/** Explainable overlap score: matched preferred styles / preferred styles. */
export function teachingCompatibility(preferences: Array<string | { id: string; weight: number }>, tutorStyleIds: string[]) {
  if (preferences.length === 0) return null;
  const tutorStyles = new Set(tutorStyleIds);
  const weighted = preferences.map((preference) => typeof preference === "string" ? { id: preference, weight: 1 } : preference);
  const totalWeight = weighted.reduce((sum, preference) => sum + preference.weight, 0);
  if (totalWeight <= 0) return null;
  const matchedWeight = weighted.reduce((sum, preference) => sum + (tutorStyles.has(preference.id) ? preference.weight : 0), 0);
  return Math.round((matchedWeight / totalWeight) * 100);
}
