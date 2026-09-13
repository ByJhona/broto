import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card, EmptyState, ListRow, SectionTitle, SkeletonBlock } from '@/components';
import { useAuth } from '@/hooks';
import { getDiagnosisHistory } from '@/services';
import type { DiagnosisHealthStatus, PlantDiagnosis } from '@/types';

function getHealthStatusMeta(colors: ThemeColors): Record<DiagnosisHealthStatus, { label: string; color: string }> {
  return {
    healthy: { label: 'Saudável', color: colors.leaf },
    attention: { label: 'Precisa de atenção', color: colors.secondary },
    urgent: { label: 'Cuidado urgente', color: colors.destructive },
  };
}

function formatDiagnosisDate(iso: string): string {
  const date = new Date(iso);
  const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${dayMonth} ${date.getFullYear()}`;
}

function DiagnosisHistorySkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      {[0, 1].map((key) => (
        <Card key={key} style={styles.historyRow}>
          <SkeletonBlock width={48} height={48} radius={Metrics.radius.md} />
          <View style={styles.historyTextBox}>
            <SkeletonBlock width="60%" height={13} />
            <SkeletonBlock width="40%" height={12} style={styles.skeletonGap} />
          </View>
        </Card>
      ))}
    </>
  );
}

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const healthStatusMeta = useMemo(() => getHealthStatusMeta(colors), [colors]);
  const { user } = useAuth();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['diagnosis-history', user?.id],
    queryFn: () => getDiagnosisHistory(user!.id),
    enabled: !!user?.id,
  });
  const showSkeleton = isLoading && history.length === 0;
  const isEmpty = !showSkeleton && history.length === 0;

  const openResult = (item: PlantDiagnosis) => {
    router.push({ pathname: '/diagnose/result', params: { diagnosis: JSON.stringify(item) } });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {showSkeleton && (
        <>
          <SectionTitle>Histórico</SectionTitle>
          <DiagnosisHistorySkeleton />
        </>
      )}
      {isEmpty && (
        <EmptyState
          icon={Sparkles}
          message='Você ainda não fez nenhum diagnóstico. Vá na aba Foto e escolha "Diagnosticar" pra começar.'
          style={styles.empty}
        />
      )}
      {!showSkeleton && !isEmpty && (
        <>
          <SectionTitle>Histórico</SectionTitle>
          {history.map((item) => {
            const meta = healthStatusMeta[item.healthStatus];
            return (
              <ListRow
                key={item.id}
                style={styles.historyRow}
                variant="card"
                leading={<Image source={{ uri: item.photoUrl }} style={styles.historyThumb} contentFit="cover" />}
                title={meta.label}
                titleColor={meta.color}
                subtitle={formatDiagnosisDate(item.createdAt)}
                trailing={<ChevronRight size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
                onPress={() => openResult(item)}
              />
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...Metrics.layout.centeredContent,
    padding: Metrics.spacing.lg,
  },
  empty: {
    paddingVertical: Metrics.spacing.xl,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.muted,
  },
  historyTextBox: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: Metrics.spacing.xs,
  },
  });
