import type { CareLevel, GrowthRate, HumidityLevel, SunLevel } from '@/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const SUN_LEVEL_STEPS: Record<SunLevel, number> = {
  shade: 1,
  partial_shade: 2,
  medium: 3,
  bright_indirect: 4,
  full_sun: 5,
};

export const HUMIDITY_STEPS: Record<HumidityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const CARE_LEVEL_KEYS: Record<CareLevel, string> = {
  easy: 'species:careLevelEasy',
  moderate: 'species:careLevelModerate',
  hard: 'species:careLevelHard',
};

const GROWTH_RATE_KEYS: Record<GrowthRate, string> = {
  slow: 'species:growthSlow',
  medium: 'species:growthMedium',
  fast: 'species:growthFast',
};

const HUMIDITY_KEYS: Record<HumidityLevel, string> = {
  low: 'species:humidityLow',
  medium: 'species:humidityMedium',
  high: 'species:humidityHigh',
};

export function careLevelLabel(level: CareLevel, t: Translate): string {
  return t(CARE_LEVEL_KEYS[level]);
}

export function growthRateLabel(rate: GrowthRate, t: Translate): string {
  return t(GROWTH_RATE_KEYS[rate]);
}

export function humidityLabel(level: HumidityLevel, t: Translate): string {
  return t(HUMIDITY_KEYS[level]);
}

export function wateringRangeLabel(minDays: number, maxDays: number, t: Translate): string {
  if (minDays !== maxDays) return t('species:wateringEveryRange', { min: minDays, max: maxDays });
  if (minDays === 1) return t('species:wateringDaily');
  return t('species:wateringEvery', { days: minDays });
}

export function temperatureRangeLabel(minC: number, maxC: number): string {
  return `${minC}–${maxC} °C`;
}

export function suggestedWateringDays(minDays: number, maxDays: number): number {
  return Math.max(1, Math.round((minDays + maxDays) / 2));
}
