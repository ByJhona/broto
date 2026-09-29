import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { EarnedBadge } from '@/types';
import { BadgeDetailModal } from '../BadgeDetailModal';
import { SectionHeading } from '../InfoSection';
import { PixelBadge } from '../PixelBadge';

type ProfileBadgesRowProps = {
  badges: EarnedBadge[];
  isOwnProfile: boolean;
};

export function ProfileBadgesRow({ badges, isOwnProfile }: Readonly<ProfileBadgesRowProps>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['profile', 'badge']);
  const [selectedBadge, setSelectedBadge] = useState<EarnedBadge | null>(null);

  if (badges.length === 0 && !isOwnProfile) return null;

  return (
    <View>
      <SectionHeading
        title={badges.length > 0 ? t('badgesTitleCount', { count: badges.length }) : t('badgesTitle')}
        actionLabel={isOwnProfile ? t('badge:seeAllBadges') : undefined}
        onAction={isOwnProfile ? () => router.push('/profile/badges') : undefined}
      />
      {badges.length === 0 ? (
        <Text style={styles.empty}>{t('badge:noBadgesMessage')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {badges.map((badge) => (
            <Pressable
              key={badge.id}
              style={styles.badge}
              onPress={() => setSelectedBadge(badge)}
              accessibilityRole="button"
              accessibilityLabel={badge.name}
            >
              <PixelBadge pixelArt={badge.pixelArt} size={Metrics.size.xl} />
              <Text style={styles.badgeName} numberOfLines={1}>
                {badge.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <BadgeDetailModal badge={selectedBadge} grantedAt={selectedBadge?.grantedAt} onClose={() => setSelectedBadge(null)} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      gap: Metrics.spacing.md,
    },
    badge: {
      alignItems: 'center',
      width: Metrics.size.xxl,
    },
    badgeName: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
      textAlign: 'center',
    },
    empty: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
