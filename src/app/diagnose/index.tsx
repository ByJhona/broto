import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import {
  CardGroup,
  EmptyState,
  FloatingScreenControls,
  ListRow,
  ScreenHeader,
  SkeletonBlock,
  useScreenTopInset,
} from '@/components';
import { useAuth } from '@/hooks';
import { getDiagnosisHistory } from '@/services';
import type { DiagnosisHealthStatus, PlantDiagnosis } from '@/types';
import { useTranslation } from '@/i18n';
import { formatShortDate, healthStatusColor } from '@/utils';

const SKELETON_ROWS = ['a', 'b', 'c'];

function getHealthStatusMeta(
  colors: ThemeColors,
  t: (key: string, options?: Record<string, unknown>) => string
): Record<DiagnosisHealthStatus, { label: string; color: string }> {
  const color = healthStatusColor(colors);
  return {
    healthy: { label: t('healthyLabel'), color: color.healthy },
    attention: { label: t('attentionLabel'), color: color.attention },
    urgent: { label: t('urgentLabel'), color: color.urgent },
  };
}

function DiagnosisHistorySkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <CardGroup>
      {SKELETON_ROWS.map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <SkeletonBlock width={Metrics.size.lg} height={Metrics.size.lg} radius={Metrics.radius.md} />
          <View style={styles.skeletonText}>
            <SkeletonBlock width="50%" />
            <SkeletonBlock width="30%" height={Metrics.fontSize.caption} />
          </View>
        </View>
      ))}
    </CardGroup>
  );
}

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('diagnose');
  const healthStatusMeta = useMemo(() => getHealthStatusMeta(colors, t), [colors, t]);
  const { user } = useAuth();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['diagnosis-history', user?.id],
    queryFn: () => getDiagnosisHistory(user!.id),
    enabled: !!user?.id,
  });
  const chevron = <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />;

  const openResult = (item: PlantDiagnosis) => {
    router.push({ pathname: '/diagnose/result', params: { diagnosis: JSON.stringify(item) } });
  };

  const renderHistory = () => {
    if (isLoading && history.length === 0) return <DiagnosisHistorySkeleton />;
    if (history.length === 0) return <EmptyState icon={Sparkles} message={t('emptyHistoryMessage')} style={styles.empty} />;
    return (
      <CardGroup>
        {history.map((item) => {
          const meta = healthStatusMeta[item.healthStatus];
          return (
            <ListRow
              key={item.id}
              style={styles.row}
              leading={<Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" />}
              title={meta.label}
              titleColor={meta.color}
              subtitle={formatShortDate(item.createdAt)}
              trailing={chevron}
              onPress={() => openResult(item)}
            />
          );
        })}
      </CardGroup>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('historyTitle')} subtitle={t('historySubtitle')} />
        {renderHistory()}
      </ScrollView>
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
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    empty: {
      paddingVertical: Metrics.spacing.xl,
    },
    row: {
      paddingVertical: Metrics.spacing.sm,
    },
    thumb: {
      width: Metrics.size.lg,
      height: Metrics.size.lg,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
    },
    skeletonText: {
      flex: 1,
      gap: Metrics.spacing.sm,
    },
  });
