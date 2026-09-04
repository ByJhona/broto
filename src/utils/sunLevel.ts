export type SunLevel = 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun';

export const SUN_LEVELS: { value: SunLevel; label: string }[] = [
  { value: 'shade', label: 'Sombra' },
  { value: 'partial_shade', label: 'Meia-sombra' },
  { value: 'medium', label: 'Luz indireta' },
  { value: 'bright_indirect', label: 'Luz indireta forte' },
  { value: 'full_sun', label: 'Sol pleno' },
];

export function sunLevelLabel(level: SunLevel): string {
  return SUN_LEVELS.find((entry) => entry.value === level)?.label ?? level;
}
