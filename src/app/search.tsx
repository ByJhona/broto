import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Avatar, EmptyState, ListRow } from '@/components';
import { useAuth } from '@/hooks';
import { searchProfiles } from '@/services';
import type { UserProfile } from '@/types';

const EMPTY_PROFILES: UserProfile[] = [];

export default function SearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      <View style={styles.searchBar}>
        <Search size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por @usuário"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        ) : null}
      </View>

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
              title="Ninguém encontrado"
              message={`Nenhum usuário com "@${trimmedQuery}".`}
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
