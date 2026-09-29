import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useRecentlyCatalogedSpecies } from '@/hooks';
import type { PlantSpeciesSearchResult } from '@/types';
import { PhotoCard } from '../PhotoCard';
import { CAROUSEL_CARD_WIDTH } from '../gridLayout';

function speciesCandidates(species: PlantSpeciesSearchResult) {
  return [
    {
      score: 1,
      scientificName: species.scientificName,
      commonName: species.commonNames[0] ?? null,
      family: null,
      genus: null,
      imageUrl: species.referencePhotos[0]?.url ?? null,
    },
  ];
}

export function RecentSpeciesStrip() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('help');
  const { species: recentSpecies } = useRecentlyCatalogedSpecies();

  if (recentSpecies.length === 0) return null;

  const handleSelect = (species: PlantSpeciesSearchResult) => {
    router.push({ pathname: '/identify/result', params: { candidates: JSON.stringify(speciesCandidates(species)), source: 'catalog' } });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('recentlyCatalogedTitle')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
        {recentSpecies.map((species) => {
          const commonName = species.commonNames[0] ?? null;
          return (
            <PhotoCard
              key={species.id}
              title={commonName ?? species.scientificName}
              subtitle={commonName ? species.scientificName : null}
              photoUrl={species.referencePhotos[0]?.url ?? null}
              placeholderIcon={Leaf}
              onPress={() => handleSelect(species)}
              recyclingKey={species.id}
              style={styles.card}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginTop: Metrics.spacing.xl,
    },
    title: {
      ...Typography.heading,
      color: colors.foreground,
      marginBottom: Metrics.spacing.sm,
    },
    scroll: {
      marginHorizontal: -Metrics.spacing.lg,
    },
    row: {
      paddingHorizontal: Metrics.spacing.lg,
      gap: Metrics.spacing.md,
      paddingBottom: Metrics.spacing.md,
    },
    card: {
      width: CAROUSEL_CARD_WIDTH,
    },
  });
