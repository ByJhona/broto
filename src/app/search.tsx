import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Search from 'lucide-react-native/icons/search';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, EmptyState, ListRow, SearchField } from '@/components';
import { useAuth } from '@/hooks';
import { searchProfiles } from '@/services';
import type { UserProfile } from '@/types';

const EMPTY_PROFILES: UserProfile[] = [];

export default function SearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('search');
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedQuery = query.trim();
  const results = trimmedQuery ? rawResults : EMPTY_PROFILES;

  useEffect(() => {
    if (!trimmedQuery) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      searchProfiles(trimmedQuery, user?.id).then((profiles) => {
        if (cancelled) return;
        setRawResults(profiles);
        setIsLoading(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [trimmedQuery, user?.id]);

  return (
    <View style={styles.container}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('searchPlaceholder')} autoFocus />

      {isLoading ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}

      <FlatList
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ListRow
            style={styles.resultRow}
            leading={<Avatar name={item.name || item.username} url={item.avatar_url} size={44} />}
            title={item.name || item.username}
            subtitle={`@${item.username}`}
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          trimmedQuery && !isLoading ? (
            <EmptyState
              icon={Search}
              title={t('noOneFound')}
              message={t('noUserFound', { query: trimmedQuery })}
              style={styles.emptyState}
            />
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    marginTop: Metrics.spacing.lg,
  },
  list: {
    ...Metrics.layout.centeredContent,
    padding: Metrics.spacing.lg,
  },
  resultRow: {
    paddingVertical: Metrics.spacing.sm,
  },
  emptyState: {
    ...Metrics.layout.centeredContent,
    marginTop: Metrics.spacing.xl,
  },
  });
