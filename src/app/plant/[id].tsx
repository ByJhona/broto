import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import HandHeart from 'lucide-react-native/icons/hand-heart';
import Leaf from 'lucide-react-native/icons/leaf';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Button, EmptyState, PromptModal, SkeletonBlock } from '@/components';
import { ASK_BUTTON_CLEARANCE, AskAboutPlantButton } from '@/components/plant/AskAboutPlantButton';
import { PlantCareNow } from '@/components/plant/PlantCareNow';
import { PlantGallery } from '@/components/plant/PlantGallery';
import { useHeroHeight } from '@/components/PhotoPager';
import { PlantGrowthSection } from '@/components/plant/PlantGrowthSection';
import { FloatingScreenControls } from '@/components/FloatingScreenControls';
import { PlantTitleBlock } from '@/components/plant/PlantTitleBlock';
import { InfoSection } from '@/components/InfoSection';
import { SpeciesSections } from '@/components/species/SpeciesSections';
import { suggestedWateringDays } from '@/components/species/speciesLabels';
import { useSpeciesInfo, type SpeciesInfoQuery } from '@/components/species/useSpeciesInfo';
import { usePlantDetail } from '@/hooks';
import type { Plant } from '@/types';

function PlantDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);
  const galleryHeight = useHeroHeight();
  return (
    <View style={styles.container}>
      <SkeletonBlock height={galleryHeight} radius={0} />
      <View style={styles.content}>
        <SkeletonBlock width="60%" height={Metrics.fontSize.display} />
        <SkeletonBlock width="40%" height={Metrics.fontSize.body} style={styles.skeletonGap} />
        <SkeletonBlock height={Metrics.media.sm} radius={Metrics.radius.lg} style={styles.skeletonBlock} />
      </View>
      <FloatingScreenControls />
    </View>
  );
}

function wateringDaysFor(plant: Plant, speciesQuery: SpeciesInfoQuery): number | null {
  if (plant.wateringDays) return plant.wateringDays;
  const info = speciesQuery.data;
  return info ? suggestedWateringDays(info.wateringDaysMin, info.wateringDaysMax) : null;
}

function SpeciesKnowledge({ plant, speciesQuery }: Readonly<{ plant: Plant; speciesQuery: SpeciesInfoQuery }>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['plant', 'species']);

  if (!plant.species) {
    return (
      <InfoSection title={t('species:careProfileTitle')}>
        <Text style={styles.note}>{t('species:noSpeciesMessage')}</Text>
      </InfoSection>
    );
  }

  return (
    <SpeciesSections
      query={speciesQuery}
      problemsAction={
        <Button variant="outline"
          label={t('diagnoseCta')}
          icon={Stethoscope}
          onPress={() => router.push({ pathname: '/identify/capture', params: { mode: 'diagnose' } })}
        />
      }
      propagationAction={
        <Button variant="outline"
          label={t('offerCuttingCta')}
          icon={HandHeart}
          onPress={() => router.push({ pathname: '/listing/new', params: { plantId: plant.id } })}
        />
      }
    />
  );
}

export default function PlantDetailScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['plant', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = usePlantDetail(id);
  const speciesQuery = useSpeciesInfo(detail.plant?.species ?? null, detail.plant?.commonName ?? null);

  if (detail.isLoading && !detail.plant) return <PlantDetailSkeleton />;

  if (!detail.plant) {
    return (
      <View style={[styles.container, styles.centered]}>
        <EmptyState icon={Leaf} message={t('plantNotFound')} />
        <FloatingScreenControls />
      </View>
    );
  }

  const { plant } = detail;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + ASK_BUTTON_CLEARANCE }}>
        <PlantGallery plant={plant} onPhotoUrlsChange={detail.setPhotoUrls} />
        <View style={styles.content}>
          <PlantTitleBlock plant={plant} plantType={speciesQuery.data?.plantType ?? null} onPressGroup={detail.handleOpenGroupPicker} />
          <PlantCareNow plant={plant} suggestedWateringDays={wateringDaysFor(plant, speciesQuery)} />
          <PlantGrowthSection plant={plant} />
          <SpeciesKnowledge plant={plant} speciesQuery={speciesQuery} />
        </View>
      </ScrollView>

      <FloatingScreenControls onOpenActions={detail.handleOpenActions} isBusy={detail.isDeleting} />
      <AskAboutPlantButton plantId={plant.id} />

      <PromptModal
        visible={detail.isRenameModalOpen}
        title={t('renameModalTitle')}
        label={t('nameLabel')}
        value={detail.nameDraft}
        onChangeText={detail.setNameDraft}
        placeholder={t('namePlaceholder')}
        error={detail.renameError}
        submitLabel={t('common:save')}
        isSubmitting={detail.isSavingName}
        onSubmit={detail.handleSaveName}
        onCancel={detail.closeRenameModal}
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
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    skeletonGap: {
      marginTop: Metrics.spacing.sm,
    },
    skeletonBlock: {
      marginTop: Metrics.spacing.xl,
    },
    note: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
