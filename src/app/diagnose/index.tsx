import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { EmptyState, LoadingScreen, SectionTitle } from '@/components';
import { useAuth } from '@/hooks';
import { getDiagnosisHistory } from '@/services';
import type { DiagnosisHealthStatus, PlantDiagnosis } from '@/types';

const HEALTH_STATUS_META: Record<DiagnosisHealthStatus, { label: string; color: string }> = {
  healthy: { label: 'Saudável', color: Colors.leaf },
  attention: { label: 'Precisa de atenção', color: Colors.secondary },
  urgent: { label: 'Cuidado urgente', color: Colors.destructive },
};

function formatDiagnosisDate(iso: string): string {
  const date = new Date(iso);
  const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${dayMonth} ${date.getFullYear()}`;
}

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [history, setHistory] = useState<PlantDiagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      getDiagnosisHistory(user.id)
        .then(setHistory)
        .finally(() => setIsLoading(false));
    }, [user])
  );

  const openResult = (item: PlantDiagnosis) => {
    router.push({ pathname: '/diagnose/result', params: { diagnosis: JSON.stringify(item) } });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {history.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          message='Você ainda não fez nenhum diagnóstico. Vá na aba Foto e escolha "Diagnosticar" pra começar.'
          style={styles.empty}
        />
      ) : (
        <>
          <SectionTitle>Histórico</SectionTitle>
          {history.map((item) => {
            const meta = HEALTH_STATUS_META[item.healthStatus];
            return (
              <Pressable key={item.id} style={styles.historyRow} onPress={() => openResult(item)}>
                <Image source={{ uri: item.photoUrl }} style={styles.historyThumb} />
                <View style={styles.historyTextBox}>
                  <Text style={[styles.historyStatus, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.historyDate}>{formatDiagnosisDate(item.createdAt)}</Text>
                </View>
                <ChevronRight size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  empty: {
    paddingVertical: Metrics.spacing.xl,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.md,
    backgroundColor: Colors.muted,
  },
  historyTextBox: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
});
