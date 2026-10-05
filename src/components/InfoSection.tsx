import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type SectionHeadingProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function HeadingAction({ actionLabel, onAction }: Readonly<Pick<SectionHeadingProps, 'actionLabel' | 'onAction'>>) {
  const styles = useThemedStyles(makeStyles);
  if (!actionLabel || !onAction) return null;
  return (
    <Pressable onPress={onAction} hitSlop={Metrics.hitSlop} accessibilityRole="button">
      <Text style={styles.action}>{actionLabel}</Text>
    </Pressable>
  );
}

export function SectionHeading({ title, actionLabel, onAction, trailing, style }: Readonly<SectionHeadingProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, style]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {trailing ?? <HeadingAction actionLabel={actionLabel} onAction={onAction} />}
    </View>
  );
}

type InfoSectionProps = PropsWithChildren<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function InfoSection({ title, actionLabel, onAction, style, children }: Readonly<InfoSectionProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.section, style]}>
      <SectionHeading title={title} actionLabel={actionLabel} onAction={onAction} />
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.md,
      marginBottom: Metrics.spacing.md,
    },
    title: {
      flexShrink: 1,
      ...Typography.title,
      color: colors.foreground,
    },
    action: {
      ...Typography.label,
      color: colors.leaf,
    },
  });
