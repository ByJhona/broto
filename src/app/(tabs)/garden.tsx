import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Leaf } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { EmptyState, OfflineBanner, PlantCard, PlantCardSkeleton } from '@/components';
import { useNetworkStatus, usePlants } from '@/hooks';
import type { PlantSummary } from '@/types';

const SKELETON_PLACEHOLDERS = [0, 1];

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const { plants, isLoading, refresh } = usePlants();
  const { isOffline } = useNetworkStatus();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const showSkeleton = isLoading && plants.length === 0;

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    await refresh();
    setIsPullRefreshing(false);
  };

  const renderPlantCard = useCallback(({ item }: { item: PlantSummary }) => <PlantCard plant={item} />, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <Text style={styles.title}>Meu jardim</Text>
      </View>

      {isOffline ? (
        <View style={styles.banner}>
          <OfflineBanner />
        </View>
      ) : null}

      {showSkeleton ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={SKELETON_PLACEHOLDERS}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <PlantCardSkeleton />}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={plants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantCard}
          refreshControl={
            <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Leaf}
              title="Nenhuma planta ainda"
              message="Toque na câmera aqui embaixo pra identificar e cadastrar a primeira."
              style={styles.empty}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Metrics.spacing.lg,
    paddingBottom: 0,
  },
  banner: {
    marginTop: Metrics.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Metrics.spacing.xl,
  },
  list: {
    flexGrow: 1,
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.md,
  },
});
