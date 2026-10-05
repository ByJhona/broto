import { Pressable, StyleSheet, Text, View } from 'react-native';
import CalendarHeart from 'lucide-react-native/icons/calendar-heart';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Folder from 'lucide-react-native/icons/folder';
import Sprout from 'lucide-react-native/icons/sprout';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Plant } from '@/types';
import { daysBetween, today } from '@/utils';
import { PageTitle } from '../PageTitle';

type Translate = (key: string, options?: Record<string, unknown>) => string;

function daysWithYouLabel(createdAt: string, t: Translate): string {
  const days = daysBetween(createdAt.slice(0, 10), today());
  if (days <= 0) return t('addedToday');
  if (days === 1) return t('withYouOneDay');
  return t('withYouDays', { days });
}

function Tag({ icon: Icon, label }: Readonly<{ icon: LucideIcon; label: string }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tag}>
      <Icon size={Metrics.chip.md.iconSize} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      <Text style={styles.tagText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type PlantTitleBlockProps = {
  plant: Plant;
  plantType: string | null;
  onPressGroup: () => void;
};

export function PlantTitleBlock({ plant, plantType, onPressGroup }: Readonly<PlantTitleBlockProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');
  const showCommonName = !!plant.commonName && plant.commonName !== plant.name;

  return (
    <View style={styles.block}>
      <PageTitle>{plant.name}</PageTitle>
      {showCommonName ? <Text style={styles.commonName}>{plant.commonName}</Text> : null}
      {plant.species ? <Text style={styles.species}>{plant.species}</Text> : null}

      <View style={styles.tags}>
        <Pressable
          style={({ pressed }) => [styles.tag, styles.groupTag, pressed && styles.groupTagPressed]}
          onPress={onPressGroup}
          accessibilityRole="button"
          accessibilityLabel={t('changeGroupA11y', { group: plant.groupName ?? t('noGroup') })}
        >
          <Folder size={Metrics.chip.md.iconSize} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
          <Text style={styles.tagText} numberOfLines={1}>
            {plant.groupName ?? t('noGroup')}
          </Text>
          <ChevronDown size={Metrics.chip.md.iconSize} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
        </Pressable>
        <Tag icon={CalendarHeart} label={daysWithYouLabel(plant.createdAt, t)} />
        {plantType ? <Tag icon={Sprout} label={plantType} /> : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    block: {
      marginBottom: Metrics.spacing.xl,
    },
    name: {
      ...Typography.display,
      color: colors.foreground,
    },
    commonName: {
      ...Typography.body,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    species: {
      ...Typography.body,
      fontStyle: 'italic',
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.md,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.md.gap,
      maxWidth: '100%',
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
    },
    groupTag: {
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    groupTagPressed: {
      backgroundColor: colors.muted,
    },
    tagText: {
      flexShrink: 1,
      ...Typography.label,
      color: colors.foreground,
    },
  });
