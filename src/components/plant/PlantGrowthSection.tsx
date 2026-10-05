import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Camera from 'lucide-react-native/icons/camera';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useCreditCosts, useCreditsGate } from '@/hooks';
import { analyzePlantGrowth, getPlantGrowthCheckins, InsufficientCreditsError } from '@/services';
import type { Plant, PlantGrowthCheckin } from '@/types';
import { Alert, formatShortDate, pickPhoto, Toast } from '@/utils';
import { OutlineButton } from '../OutlineButton';
import { SkeletonBlock } from '../Skeleton';
import { InfoSection } from '../InfoSection';

const THUMB_WIDTH = Metrics.size.hero;
const THUMB_HEIGHT = THUMB_WIDTH / Metrics.aspect.portrait;

type CheckinStripProps = {
  checkins: PlantGrowthCheckin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function CheckinStrip({ checkins, selectedId, onSelect }: Readonly<CheckinStripProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {checkins.map((checkin) => {
        const isSelected = checkin.id === selectedId;
        return (
          <Pressable
            key={checkin.id}
            onPress={() => onSelect(checkin.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatShortDate(checkin.createdAt)}
          >
            <Image
              source={{ uri: checkin.photoUrl }}
              style={[styles.thumb, isSelected && styles.thumbSelected]}
              contentFit="cover"
            />
            <Text style={[styles.thumbDate, isSelected && styles.thumbDateSelected]}>{formatShortDate(checkin.createdAt)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Observations({ checkin }: Readonly<{ checkin: PlantGrowthCheckin }>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.observations}>
      {checkin.observations.map((observation) => (
        <View key={observation} style={styles.observationRow}>
          <View style={styles.bullet} />
          <Text style={styles.observationText}>{observation}</Text>
        </View>
      ))}
    </View>
  );
}

function useGrowthAnalysis(plant: Plant, onAnalyzed: (checkin: PlantGrowthCheckin) => void) {
  const router = useRouter();
  const { t } = useTranslation('plant');
  const queryClient = useQueryClient();
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const cost = useCreditCosts().growth_check;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const showInsufficientCreditsAlert = () => {
    Alert.alert(t('insufficientCreditsTitle'), t('growthAnalysisCreditsMessage', { cost }), [
      { text: t('notNow'), style: 'cancel' },
      { text: t('seePlans'), onPress: () => router.push('/profile/plans') },
    ]);
  };

  const analyze = async () => {
    if (!canAffordCost(cost)) {
      showInsufficientCreditsAlert();
      return;
    }

    const uri = await pickPhoto(t('analyzePlantPickerTitle'));
    if (!uri) return;

    setIsAnalyzing(true);
    try {
      const { checkin, newCreditBalance } = await analyzePlantGrowth(plant.id, uri);
      applyCreditBalance(newCreditBalance);
      queryClient.setQueryData<PlantGrowthCheckin[]>(['plant-growth-checkins', plant.id], (current = []) => [checkin, ...current]);
      onAnalyzed(checkin);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) showInsufficientCreditsAlert();
      else Toast.error(t('growthAnalysisError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { cost, isAnalyzing, analyze };
}

export function PlantGrowthSection({ plant }: Readonly<{ plant: Plant }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['plant-growth-checkins', plant.id],
    queryFn: () => getPlantGrowthCheckins(plant.id),
  });
  const { cost, isAnalyzing, analyze } = useGrowthAnalysis(plant, (checkin) => setSelectedId(checkin.id));
  const selected = checkins.find((checkin) => checkin.id === selectedId) ?? checkins[0] ?? null;

  return (
    <InfoSection title={t('growthTitle')}>
      {isLoading ? <SkeletonBlock height={THUMB_HEIGHT} radius={Metrics.radius.md} /> : null}
      {!isLoading && selected ? (
        <>
          <CheckinStrip checkins={checkins} selectedId={selected.id} onSelect={setSelectedId} />
          <Observations checkin={selected} />
        </>
      ) : null}
      {!isLoading && !selected ? <Text style={styles.emptyText}>{t('growthEmpty')}</Text> : null}
      <OutlineButton
        label={isAnalyzing ? t('analyzing') : t('analyzeButton', { cost })}
        icon={Camera}
        onPress={analyze}
        loading={isAnalyzing}
        style={styles.button}
      />
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    strip: {
      gap: Metrics.spacing.md,
    },
    thumb: {
      width: THUMB_WIDTH,
      height: THUMB_HEIGHT,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: 'transparent',
    },
    thumbSelected: {
      borderColor: colors.leaf,
    },
    thumbDate: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
      textAlign: 'center',
    },
    thumbDateSelected: {
      ...Typography.captionLabel,
      color: colors.leaf,
    },
    observations: {
      gap: Metrics.spacing.xs,
      marginTop: Metrics.spacing.md,
    },
    observationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.sm,
    },
    bullet: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.leaf,
      marginTop: Metrics.spacing.sm,
    },
    observationText: {
      flex: 1,
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    emptyText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    button: {
      marginTop: Metrics.spacing.md,
      alignSelf: 'flex-start',
    },
  });
