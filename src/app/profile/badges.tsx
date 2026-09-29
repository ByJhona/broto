import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { BadgeDetailModal, FloatingScreenControls, PixelBadge, ScreenHeader, SectionHeading, useScreenTopInset } from '@/components';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { getBadgeCatalog, getUserBadges } from '@/services';
import type { Badge, BadgeBatch } from '@/types';

type EarnedAtByBadgeId = Map<string, string>;

type BadgeTileProps = {
  badge: Badge;
  grantedAt: string | null;
  onPress: () => void;
  styles: Styles;
};

function BadgeTile({ badge, grantedAt, onPress, styles }: Readonly<BadgeTileProps>) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <PixelBadge pixelArt={badge.pixelArt} size={Metrics.size.xxl} locked={!grantedAt} />
      <Text style={[styles.tileName, !grantedAt && styles.tileNameLocked]} numberOfLines={1}>
        {badge.name}
      </Text>
    </Pressable>
  );
}

type BadgeBatchSectionProps = {
  batch: BadgeBatch;
  earnedAtByBadgeId: EarnedAtByBadgeId;
  onPressBadge: (badge: Badge, grantedAt: string | null) => void;
  styles: Styles;
};

function BadgeBatchSection({ batch, earnedAtByBadgeId, onPressBadge, styles }: Readonly<BadgeBatchSectionProps>) {
  return (
    <View style={styles.section}>
      <SectionHeading title={batch.name} style={styles.batchHeading} />
      <Text style={styles.batchDescription}>{batch.description}</Text>
      <View style={styles.tileRow}>
        {batch.badges.map((badge) => {
          const grantedAt = earnedAtByBadgeId.get(badge.id) ?? null;
          return (
            <BadgeTile
              key={badge.id}
              badge={badge}
              grantedAt={grantedAt}
              onPress={() => onPressBadge(badge, grantedAt)}
              styles={styles}
            />
          );
        })}
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;
type SelectedBadge = { badge: Badge; grantedAt: string | null };

export default function BadgeCatalogScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const { t } = useTranslation('badge');
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [selected, setSelected] = useState<SelectedBadge | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const catalogQuery = useQuery({
    queryKey: ['badge-catalog'],
    queryFn: getBadgeCatalog,
  });

  const userBadgesQuery = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: () => getUserBadges(user!.id),
    enabled: !!user,
  });

  const batches = catalogQuery.data ?? [];
  const earnedAtByBadgeId = useMemo<EarnedAtByBadgeId>(
    () => new Map((userBadgesQuery.data ?? []).map((entry) => [entry.badgeId, entry.grantedAt])),
    [userBadgesQuery.data]
  );

  const totalBadges = batches.reduce((sum, batch) => sum + batch.badges.length, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([catalogQuery.refetch(), userBadgesQuery.refetch()]);
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
    >
      <ScreenHeader
        title={t('catalogTitle')}
        subtitle={totalBadges > 0 ? t('catalogProgress', { earned: earnedAtByBadgeId.size, total: totalBadges }) : undefined}
        style={styles.header}
      />
      {batches.map((batch) => (
        <BadgeBatchSection
          key={batch.id}
          batch={batch}
          earnedAtByBadgeId={earnedAtByBadgeId}
          onPressBadge={(badge, grantedAt) => setSelected({ badge, grantedAt })}
          styles={styles}
        />
      ))}

      <BadgeDetailModal badge={selected?.badge ?? null} grantedAt={selected?.grantedAt} onClose={() => setSelected(null)} />
    </ScrollView>
    <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      gap: Metrics.spacing.lg,
    },
    header: {
      marginBottom: 0,
    },
    section: {
      gap: Metrics.spacing.xs,
    },
    batchHeading: {
      marginBottom: 0,
    },
    batchDescription: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.sm,
    },
    tileRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.md,
    },
    tile: {
      width: Metrics.size.hero,
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    tileName: {
      ...Typography.captionLabel,
      color: colors.foreground,
      textAlign: 'center',
    },
    tileNameLocked: {
      color: colors.mutedForeground,
    },
  });
