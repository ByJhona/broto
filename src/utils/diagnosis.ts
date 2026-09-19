import type { ThemeColors } from '@/theme';
import type { DiagnosisHealthStatus } from '@/types';

export function healthStatusColor(colors: ThemeColors): Record<DiagnosisHealthStatus, string> {
  return {
    healthy: colors.leaf,
    attention: colors.secondary,
    urgent: colors.destructive,
  };
}
