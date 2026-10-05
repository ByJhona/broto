import { Pressable, StyleSheet, Text, View } from 'react-native';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import Leaf from 'lucide-react-native/icons/leaf';
import Sprout from 'lucide-react-native/icons/sprout';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantCandidate } from '@/types';
import { InfoChip } from '../InfoChip';
import { confidencePercent, confidenceTier, type ConfidenceTier } from './confidence';
import { PageTitle } from '../PageTitle';

const TIER_LABEL_KEYS: Record<ConfidenceTier, string> = {
  high: 'confidenceHigh',
  medium: 'confidenceMedium',
  low: 'confidenceLow',
};

function tierColor(tier: ConfidenceTier, colors: ThemeColors): string {
  if (tier === 'high') return colors.leaf;
  if (tier === 'medium') return colors.primary;
  return colors.destructive;
}

function ConfidenceTag({ score }: Readonly<{ score: number }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');
  const tier = confidenceTier(score);
  const tone = tierColor(tier, colors);

  return (
    <View style={[styles.confidence, { backgroundColor: `${tone}14` }]}>
      <View style={[styles.confidenceDot, { backgroundColor: tone }]} />
      <Text style={[styles.confidenceLabel, { color: tone }]}>{t(TIER_LABEL_KEYS[tier])}</Text>
      <Text style={styles.confidencePercent}>{t('confidencePercent', { percent: confidencePercent(score) })}</Text>
    </View>
  );
}

type CandidateHeaderProps = {
  candidate: PlantCandidate;
  plantType: string | null;
  showConfidence: boolean;
  onRetake: () => void;
};

export function CandidateHeader({ candidate, plantType, showConfidence, onRetake }: Readonly<CandidateHeaderProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');
  const isUncertain = showConfidence && confidenceTier(candidate.score) === 'low';

  return (
    <View style={styles.block}>
      {showConfidence ? <ConfidenceTag score={candidate.score} /> : null}
      <PageTitle>{candidate.commonName ?? candidate.scientificName}</PageTitle>
      {candidate.commonName ? <Text style={styles.species}>{candidate.scientificName}</Text> : null}

      <View style={styles.tags}>
        {candidate.family ? <InfoChip size="sm" icon={Leaf} value={candidate.family} /> : null}
        {plantType ? <InfoChip size="sm" icon={Sprout} value={plantType} /> : null}
      </View>

      {isUncertain ? (
        <View style={styles.notice}>
          <CircleHelp size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
          <View style={styles.noticeBody}>
            <Text style={styles.noticeText}>{t('lowConfidenceMessage')}</Text>
            <Pressable onPress={onRetake} hitSlop={Metrics.hitSlop} accessibilityRole="button">
              <Text style={styles.noticeAction}>{t('retakePhotoCta')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    block: {
      marginBottom: Metrics.spacing.xl,
    },
    confidence: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: Metrics.chip.md.gap,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
      marginBottom: Metrics.spacing.md,
    },
    confidenceDot: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
    },
    confidenceLabel: {
      ...Typography.labelStrong,
    },
    confidencePercent: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    name: {
      ...Typography.display,
      color: colors.foreground,
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
      gap: Metrics.spacing.xs,
      marginTop: Metrics.spacing.md,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
      marginTop: Metrics.spacing.md,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      backgroundColor: colors.muted,
    },
    noticeBody: {
      flex: 1,
      gap: Metrics.spacing.sm,
    },
    noticeText: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    noticeAction: {
      ...Typography.labelStrong,
      color: colors.leaf,
    },
  });
