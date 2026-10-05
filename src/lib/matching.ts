export type TeachingStyle = { id: string; name: string };

/** Explainable overlap score: matched preferred styles / preferred styles. */
export function teachingCompatibility(preferredStyleIds: string[], tutorStyleIds: string[]) {
  if (preferredStyleIds.length === 0) return null;
  const tutorStyles = new Set(tutorStyleIds);
  const matches = preferredStyleIds.filter((styleId) => tutorStyles.has(styleId)).length;
  return Math.round((matches / preferredStyleIds.length) * 100);
}
