import { StyleSheet } from 'react-native';
import { Elevation, Metrics, type ThemeColors, Typography } from '@/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    locateButton: {
      position: 'absolute',
      right: Metrics.spacing.lg + (Metrics.size.xl - Metrics.size.lg) / 2,
    },
    mapFilters: {
      position: 'absolute',
      left: 0,
      right: 0,
    },
    mapFiltersRow: {
      paddingHorizontal: Metrics.spacing.lg,
      paddingVertical: Metrics.spacing.xs,
    },
    placingPin: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -Metrics.size.lg / 2,
      marginTop: -Metrics.size.xl,
    },
    placingPanel: {
      position: 'absolute',
      left: Metrics.spacing.lg,
      right: Metrics.spacing.lg,
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.md,
      ...Elevation.medium,
      shadowColor: colors.black,
    },
    placingText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: Metrics.spacing.xs,
    },
    cancelButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
  });
