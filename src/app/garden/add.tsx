import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Camera from 'lucide-react-native/icons/camera';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  EmptyState,
  FloatingScreenControls,
  IconBadge,
  ListRow,
  PageTitle,
  SearchField,
  SkeletonBlock,
  SubmitButton,
  useScreenTopInset,
} from '@/components';
import { searchPlantSpecies } from '@/services';
import type { PlantSpeciesSearchResult } from '@/types';

const EMPTY_RESULTS: PlantSpeciesSearchResult[] = [];
const SKELETON_ROWS = ['a', 'b', 'c'];

function useSpeciesSearch(query: string) {
  const [rawResults, setRawResults] = useState<PlantSpeciesSearchResult[]>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      searchPlantSpecies(query).then((species) => {
        if (cancelled) return;
        setRawResults(species);
        setIsLoading(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return { results: query ? rawResults : EMPTY_RESULTS, isLoading };
}

type PlantThumbnailProps = {
  item: PlantSpeciesSearchResult;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
};

function PlantThumbnail({ item, colors, styles }: Readonly<PlantThumbnailProps>) {
  const photoUrl = item.referencePhotos[0]?.url;

  if (!photoUrl) {
    return (
      <View style={[styles.thumb, styles.thumbPlaceholder]}>
        <Leaf size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      </View>
    );
  }

  return <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" />;
}

function ResultsSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.skeleton}>
      {SKELETON_ROWS.map((key) => (
        <SkeletonBlock key={key} height={Metrics.size.xxl} radius={Metrics.radius.lg} />
      ))}
    </View>
  );
}

export default function AddPlantManualScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('garden');
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const { results, isLoading } = useSpeciesSearch(trimmedQuery);
  const chevron = <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />;

  const handleSelectPlant = (species: PlantSpeciesSearchResult) => {
    const candidates = [
      {
        score: 1,
        scientificName: species.scientificName,
        commonName: species.commonNames[0] ?? null,
        family: null,
        genus: null,
        imageUrl: species.referencePhotos[0]?.url ?? null,
      },
    ];

    router.push({
      pathname: '/identify/result',
      params: { candidates: JSON.stringify(candidates), source: 'catalog' },
    });
  };

  const handleIdentifyByPhoto = () => {
    router.push({ pathname: '/identify/capture', params: { mode: 'identify' } });
  };

  const renderEmpty = () => {
    if (!trimmedQuery) return null;
    if (isLoading) return <ResultsSkeleton />;
    return (
      <View style={styles.emptyContainer}>
        <EmptyState icon={Leaf} title={t('addPlantNotFoundTitle')} message={t('addPlantNotFoundMessage')} />
        <SubmitButton label={t('addPlantIdentifyByPhoto')} onPress={handleIdentifyByPhoto} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <PageTitle>{t('addPlantTitle')}</PageTitle>
        <Text style={styles.subtitle}>{t('addPlantSubtitle')}</Text>
      </View>

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('addPlantSearchPlaceholder')}
        autoFocus
        autoCapitalize="sentences"
      />

      <FlatList
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          trimmedQuery ? null : (
            <ListRow
              variant="card"
              leading={
                <IconBadge backgroundColor={`${colors.leaf}1F`}>
                  <Camera size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
                </IconBadge>
              }
              title={t('addPlantIdentifyByPhoto')}
              subtitle={t('addPlantIdentifyHint')}
              trailing={chevron}
              onPress={handleIdentifyByPhoto}
            />
          )
        }
        renderItem={({ item }) => (
          <ListRow
            variant="card"
            style={styles.row}
            leading={<PlantThumbnail item={item} colors={colors} styles={styles} />}
            title={item.commonNames[0] ?? item.scientificName}
            subtitle={item.commonNames[0] ? item.scientificName : undefined}
            trailing={chevron}
            onPress={() => handleSelectPlant(item)}
          />
        )}
        ListEmptyComponent={renderEmpty()}
      />
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
    header: {
      ...Metrics.layout.centeredContent,
      gap: Metrics.spacing.xs,
      paddingHorizontal: Metrics.spacing.lg,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    list: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
    },
    row: {
      marginBottom: Metrics.spacing.sm,
    },
    skeleton: {
      gap: Metrics.spacing.sm,
    },
    emptyContainer: {
      gap: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    thumb: {
      width: Metrics.size.xl,
      height: Metrics.size.xl,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    thumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
