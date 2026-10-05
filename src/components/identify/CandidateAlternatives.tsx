import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantCandidate } from '@/types';
import { InfoSection } from '../InfoSection';
import { confidencePercent } from './confidence';
import { TextButton } from '../TextButton';

type AlternativeRowProps = {
  candidate: PlantCandidate;
  onPress: () => void;
};

function AlternativeRow({ candidate, onPress }: Readonly<AlternativeRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');
  const name = candidate.commonName ?? candidate.scientificName;
  const percent = t('confidencePercent', { percent: confidencePercent(candidate.score) });

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${percent}`}
    >
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {candidate.commonName ? (
          <Text style={styles.species} numberOfLines={1}>
            {candidate.scientificName}
          </Text>
        ) : null}
      </View>
      <Text style={styles.percent}>{percent}</Text>
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
    </Pressable>
  );
}

type CandidateAlternativesProps = {
  candidates: PlantCandidate[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRetake: (() => void) | null;
};

export function CandidateAlternatives({ candidates, selectedIndex, onSelect, onRetake }: Readonly<CandidateAlternativesProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');

  if (candidates.length < 2) return null;

  return (
    <InfoSection title={t('otherPossibilitiesTitle')}>
      <View style={styles.list}>
        {candidates.map((candidate, index) =>
          index === selectedIndex ? null : (
            <AlternativeRow key={candidate.scientificName} candidate={candidate} onPress={() => onSelect(index)} />
          )
        )}
      </View>
      {onRetake ? (
        <TextButton label={t('noneOfTheseCta')} tone="leaf" onPress={onRetake} style={styles.retake} />
      ) : null}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: Metrics.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.muted,
    },
    rowText: {
      flex: 1,
    },
    name: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    species: {
      ...Typography.bodySmall,
      fontStyle: 'italic',
      color: colors.mutedForeground,
    },
    percent: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    retake: {
      marginTop: Metrics.spacing.md,
      alignSelf: 'flex-start',
    },
  });
