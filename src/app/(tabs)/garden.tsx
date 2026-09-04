import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Leaf } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { EmptyState, OfflineBanner, PlantCard } from '@/components';
import { useNetworkStatus, usePlants } from '@/hooks';

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const { plants, isLoading, isRefreshing, refresh } = usePlants();
  const { isOffline } = useNetworkStatus();
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

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

      <FlatList
        contentContainerStyle={styles.list}
        columnWrapperStyle={plants.length > 0 ? styles.row : undefined}
        numColumns={2}
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlantCard plant={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={Leaf}
              title="Nenhuma planta ainda"
              message="Toque na câmera aqui embaixo pra identificar e cadastrar a primeira."
              style={styles.empty}
            />
          ) : null
        }
      />
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
  row: {
    gap: Metrics.spacing.md,
  },
});
