export type ConfidenceTier = 'high' | 'medium' | 'low';

const HIGH_CONFIDENCE = 0.75;
const MEDIUM_CONFIDENCE = 0.45;

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= HIGH_CONFIDENCE) return 'high';
  if (score >= MEDIUM_CONFIDENCE) return 'medium';
  return 'low';
}

export function confidencePercent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}
