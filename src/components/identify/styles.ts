import { StyleSheet } from 'react-native';
import { Metrics, type ThemeColors, Typography } from '@/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
    },
    header: {
      marginBottom: Metrics.spacing.lg,
    },
    title: {
      ...Typography.headline,
      color: colors.foreground,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    actionsRow: {
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.md,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      backgroundColor: colors.leaf,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.md,
    },
    actionTextBox: {
      flex: 1,
    },
    actionTitle: {
      ...Typography.heading,
      color: colors.leafForeground,
    },
    actionSubtitle: {
      ...Typography.bodySmall,
      color: colors.leafForeground,
      opacity: 0.85,
      marginTop: Metrics.spacing.xs,
    },
    historyLink: {
      alignItems: 'center',
      marginBottom: Metrics.spacing.lg,
    },
    historyLinkText: {
      ...Typography.label,
      color: colors.leaf,
    },
    specialistRow: {
      marginBottom: Metrics.spacing.xl,
    },
    articlesTitle: {
      ...Typography.headline,
      color: colors.foreground,
      marginTop: Metrics.spacing.xl,
      marginBottom: Metrics.spacing.sm,
    },
  });
