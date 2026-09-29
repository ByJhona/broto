import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSpeciesInfo } from '@/types';
import { CardGroup } from '../CardGroup';
import { OutlineButton } from '../OutlineButton';
import { SkeletonBlock } from '../Skeleton';
import { AboutSpeciesSection } from './AboutSpeciesSection';
import { CareProfileCard } from './CareProfileCard';
import { CommonProblemsSection } from './CommonProblemsSection';
import { PropagationSection } from './PropagationSection';
import { SafetySection } from './SafetySection';
import type { SpeciesInfoQuery } from './useSpeciesInfo';

const SKELETON_ROWS = [0, 1, 2, 3];

function SpeciesSectionsSkeleton() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  return (
    <View style={styles.block}>
      <SkeletonBlock width="50%" height={Metrics.fontSize.title} style={styles.skeletonTitle} />
      <Text style={styles.pendingText}>{t('preparingProfile')}</Text>
      <CardGroup>
        {SKELETON_ROWS.map((row) => (
          <View key={row} style={styles.skeletonRow}>
            <SkeletonBlock width={Metrics.size.md} height={Metrics.size.md} radius={Metrics.radius.full} />
            <View style={styles.skeletonText}>
              <SkeletonBlock width="30%" height={Metrics.fontSize.caption} />
              <SkeletonBlock width="55%" height={Metrics.fontSize.small} />
              <SkeletonBlock width="90%" height={Metrics.fontSize.small} />
            </View>
          </View>
        ))}
      </CardGroup>
    </View>
  );
}

function SpeciesInfoError({ isRetrying, onRetry }: Readonly<{ isRetrying: boolean; onRetry: () => void }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  return (
    <View style={[styles.block, styles.errorCard]}>
      <CloudOff size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.errorTitle}>{t('infoErrorTitle')}</Text>
      <Text style={styles.errorMessage}>{t('infoErrorMessage')}</Text>
      <OutlineButton label={t('common:tryAgain')} icon={RotateCw} onPress={onRetry} loading={isRetrying} style={styles.retry} />
    </View>
  );
}

type SpeciesSectionsProps = {
  query: SpeciesInfoQuery;
  problemsAction?: ReactNode;
  propagationAction?: ReactNode;
};

function SpeciesSectionsContent({
  info,
  problemsAction,
  propagationAction,
}: Readonly<{ info: PlantSpeciesInfo; problemsAction?: ReactNode; propagationAction?: ReactNode }>) {
  return (
    <>
      <CareProfileCard info={info} />
      <SafetySection info={info} />
      <CommonProblemsSection problems={info.commonProblems} action={problemsAction} />
      <PropagationSection methods={info.propagationMethods} action={propagationAction} />
      <AboutSpeciesSection info={info} />
    </>
  );
}

export function SpeciesSections({ query, problemsAction, propagationAction }: Readonly<SpeciesSectionsProps>) {
  if (query.data) {
    return <SpeciesSectionsContent info={query.data} problemsAction={problemsAction} propagationAction={propagationAction} />;
  }
  if (query.isError) {
    return <SpeciesInfoError isRetrying={query.isFetching} onRetry={() => query.refetch()} />;
  }
  return <SpeciesSectionsSkeleton />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    block: {
      marginBottom: Metrics.spacing.xl,
    },
    skeletonTitle: {
      marginBottom: Metrics.spacing.sm,
    },
    pendingText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.md,
    },
    skeletonRow: {
      flexDirection: 'row',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
    },
    skeletonText: {
      flex: 1,
      gap: Metrics.spacing.sm,
    },
    errorCard: {
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      padding: Metrics.spacing.lg,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    errorTitle: {
      ...Typography.heading,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: Metrics.spacing.xs,
    },
    errorMessage: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    retry: {
      marginTop: Metrics.spacing.sm,
    },
  });
