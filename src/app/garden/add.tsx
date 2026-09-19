import { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, ListRow, SubmitButton } from '@/components';
import { searchPlantSpecies } from '@/services';
import type { PlantSpeciesSearchResult } from '@/types';

const EMPTY_RESULTS: PlantSpeciesSearchResult[] = [];

export default function AddPlantManualScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { t } = useTranslation('garden');

  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<PlantSpeciesSearchResult[]>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedQuery = query.trim();
  const results = trimmedQuery ? rawResults : EMPTY_RESULTS;

  useEffect(() => {
    if (!trimmedQuery) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      searchPlantSpecies(trimmedQuery).then((species) => {
        if (cancelled) return;
        setRawResults(species);
        setIsLoading(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [trimmedQuery]);

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
      params: { candidates: JSON.stringify(candidates) },
    });
  };

  const handleIdentifyFallback = () => {
    router.push({ pathname: '/identify/capture', params: { mode: 'identify' } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('addPlantSearchPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          autoCapitalize="sentences"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ListRow
            variant="card"
            style={styles.row}
            leading={<PlantThumbnail item={item} colors={colors} styles={styles} />}
            title={item.commonNames[0] ?? item.scientificName}
            subtitle={item.commonNames[0] ? item.scientificName : undefined}
            trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
            onPress={() => handleSelectPlant(item)}
          />
        )}
        ListEmptyComponent={
          trimmedQuery && !isLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={Leaf}
                title={t('addPlantNotFoundTitle')}
                message={t('addPlantNotFoundMessage')}
              />
              <View style={styles.fallbackAction}>
                <SubmitButton label={t('addPlantIdentifyByPhoto')} onPress={handleIdentifyFallback} />
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
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
        <Leaf size={20} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
    );
  }

  return <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBar: {
      ...Metrics.layout.centeredContent,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingHorizontal: Metrics.spacing.md,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Metrics.spacing.sm,
      fontSize: 15,
      color: colors.foreground,
    },
    loader: {
      marginTop: Metrics.spacing.lg,
    },
    emptyContainer: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.xl,
      paddingTop: Metrics.spacing.xl,
    },
    list: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
      paddingBottom: 100,
    },
    row: {
      marginBottom: Metrics.spacing.sm,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    thumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackAction: {
      marginTop: Metrics.spacing.xl,
      alignSelf: 'stretch',
    },
  });
