import { i18n } from '@/i18n';

export type SunLevel = 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun';

export function sunLevels(): { value: SunLevel; label: string }[] {
  return (['shade', 'partial_shade', 'medium', 'bright_indirect', 'full_sun'] as const).map((value) => ({
    value,
    label: i18n.t(`sunLevel:${value}`),
  }));
}

export function sunLevelLabel(level: SunLevel): string {
  return i18n.t(`sunLevel:${level}`);
}
