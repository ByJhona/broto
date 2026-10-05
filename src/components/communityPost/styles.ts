import { StyleSheet } from 'react-native';
import { Metrics, type ThemeColors, Typography, Opacity } from '@/theme';

export type Styles = ReturnType<typeof makeStyles>;

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: Metrics.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      paddingTop: Metrics.spacing.md,
      paddingBottom: Metrics.spacing.sm,
    },
    headerAuthor: {
      flex: 1,
    },
    menuButton: {
      padding: Metrics.spacing.xs,
    },
    skeletonLines: {
      gap: Metrics.spacing.xs,
    },
    body: {
      gap: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      paddingTop: Metrics.spacing.sm,
      paddingBottom: Metrics.spacing.md,
    },
    caption: {
      ...Typography.body,
      color: colors.foreground,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.lg,
    },
    footerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    footerText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    footerTextActive: {
      color: colors.primary,
    },
    preview: {
      gap: Metrics.spacing.xs,
    },
    previewText: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    previewAuthor: {
      ...Typography.labelStrong,
      color: colors.foreground,
    },
    previewLink: {
      ...Typography.label,
      color: colors.leaf,
    },
    comments: {
      gap: Metrics.spacing.sm,
      paddingTop: Metrics.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    comment: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.md,
      padding: Metrics.spacing.sm,
    },
    commentBody: {
      flex: 1,
    },
    commentMenuButton: {
      padding: Metrics.spacing.xs,
    },
    commentAuthor: {
      ...Typography.labelStrong,
      color: colors.foreground,
    },
    commentTime: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    commentText: {
      ...Typography.bodySmall,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    commentPhoto: {
      width: Metrics.media.sm,
      height: Metrics.media.sm,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
      marginTop: Metrics.spacing.xs,
    },
    attachmentPreviewWrapper: {
      position: 'relative',
      width: Metrics.size.xl,
      height: Metrics.size.xl,
      marginTop: Metrics.spacing.xs,
    },
    attachmentPreview: {
      width: Metrics.size.xl,
      height: Metrics.size.xl,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    attachmentRemoveButton: {
      position: 'absolute',
      top: -Metrics.spacing.xs,
      right: -Metrics.spacing.xs,
      width: Metrics.size.xs,
      height: Metrics.size.xs,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.foreground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.xs,
    },
    commentPhotoButton: {
      width: Metrics.size.md,
      height: Metrics.size.md,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.background,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentInput: {
      flex: 1,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingHorizontal: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
      ...Typography.inputSmall,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    commentInputDisabled: {
      opacity: Opacity.disabled,
    },
    commentSend: {
      width: Metrics.size.md,
      height: Metrics.size.md,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentSendDisabled: {
      opacity: Opacity.disabled,
    },
  });
