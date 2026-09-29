import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { MetaRow, type MetaTone } from './MetaRow';
import { SkeletonBlock } from './Skeleton';

export type PhotoCardMeta = {
  icon: LucideIcon;
  label: string;
  tone?: MetaTone;
};

type PhotoCardProps = {
  title: string;
  photoUrl: string | null;
  placeholderIcon: LucideIcon;
  placeholderColor?: string;
  subtitle?: string | null;
  meta?: PhotoCardMeta | null;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  recyclingKey?: string;
  style?: StyleProp<ViewStyle>;
};

export const PhotoCard = memo(function PhotoCard({
  title,
  photoUrl,
  placeholderIcon: PlaceholderIcon,
  placeholderColor,
  subtitle,
  meta,
  topLeft,
  topRight,
  onPress,
  accessibilityLabel,
  recyclingKey,
  style,
}: Readonly<PhotoCardProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <View style={styles.photo}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photoImage} contentFit="cover" recyclingKey={recyclingKey} cachePolicy="memory-disk" />
        ) : (
          <PlaceholderIcon size={Metrics.icon.xl} color={placeholderColor ?? colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        )}
        {topLeft ? <View style={styles.topLeft}>{topLeft}</View> : null}
        {topRight ? <View style={styles.topRight}>{topRight}</View> : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <MetaRow icon={meta.icon} label={meta.label} tone={meta.tone} size="caption" style={styles.meta} /> : null}
      </View>
    </Pressable>
  );
});

export function PhotoCardSkeleton({ style }: Readonly<{ style?: StyleProp<ViewStyle> }>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.photo} />
      <View style={styles.info}>
        <SkeletonBlock width="70%" height={Metrics.fontSize.body} />
        <SkeletonBlock width="50%" height={Metrics.fontSize.caption} style={styles.skeletonGap} />
      </View>
    </View>
  );
}

type PhotoBadgeProps = {
  icon?: LucideIcon;
  label: string;
  color: string;
};

export function PhotoBadge({ icon: Icon, label, color }: Readonly<PhotoBadgeProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {Icon ? <Icon size={Metrics.chip.sm.iconSize} color={colors.white} strokeWidth={2} /> : null}
      <Text style={styles.badgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.8,
    },
    photo: {
      width: '100%',
      aspectRatio: Metrics.aspect.portrait,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    topLeft: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      left: Metrics.spacing.sm,
      right: Metrics.spacing.xl,
      alignItems: 'flex-start',
    },
    topRight: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      right: Metrics.spacing.sm,
    },
    info: {
      paddingHorizontal: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
    },
    title: {
      ...Typography.heading,
      color: colors.foreground,
    },
    subtitle: {
      ...Typography.caption,
      fontStyle: 'italic',
      color: colors.mutedForeground,
    },
    meta: {
      marginTop: Metrics.spacing.xs,
    },
    skeletonGap: {
      marginTop: Metrics.spacing.xs,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.sm.gap,
      maxWidth: '100%',
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    badgeText: {
      flexShrink: 1,
      ...Typography.captionStrong,
      color: colors.white,
    },
  });
