import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { Avatar, EmptyState } from '@/components';
import { useAuth } from '@/hooks';
import { searchProfiles } from '@/services';
import type { UserProfile } from '@/types';

const EMPTY_PROFILES: UserProfile[] = [];

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedQuery = query.trim();
  const results = trimmedQuery ? rawResults : EMPTY_PROFILES;

  useEffect(() => {
    if (!trimmedQuery) return;

    const timeout = setTimeout(() => {
      setIsLoading(true);
      searchProfiles(trimmedQuery, user?.id).then((profiles) => {
        setRawResults(profiles);
        setIsLoading(false);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [trimmedQuery, user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por @usuário"
          placeholderTextColor={Colors.mutedForeground}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator style={styles.loader} color={Colors.leaf} /> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultRow}
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
          >
            <Avatar name={item.name || item.username} url={item.avatar_url} size={44} />
            <View style={styles.resultTextBox}>
              <Text style={styles.resultName}>{item.name || item.username}</Text>
              <Text style={styles.resultUsername}>@{item.username}</Text>
            </View>
          </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Metrics.radius.full,
    paddingHorizontal: Metrics.spacing.md,
    marginHorizontal: Metrics.spacing.lg,
    marginTop: Metrics.spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Metrics.spacing.sm,
    fontSize: 15,
    color: Colors.foreground,
  },
  loader: {
    marginTop: Metrics.spacing.lg,
  },
  list: {
    padding: Metrics.spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    paddingVertical: Metrics.spacing.sm,
  },
  resultTextBox: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  resultUsername: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
  emptyState: {
    marginTop: Metrics.spacing.xl,
  },
});
