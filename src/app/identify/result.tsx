import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Camera from 'lucide-react-native/icons/camera';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, Overlays, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, NewBadgeModal, OutlineButton, PhotoBadge, PhotoPager, PromptModal, SubmitButton } from '@/components';
import { CandidateAlternatives } from '@/components/identify/CandidateAlternatives';
import { CandidateHeader } from '@/components/identify/CandidateHeader';
import { ReferencePhotosStrip } from '@/components/identify/ReferencePhotosStrip';
import { useAddIdentifiedPlant } from '@/components/identify/useAddIdentifiedPlant';
import { FloatingScreenControls } from '@/components/FloatingScreenControls';
import { SpeciesSections } from '@/components/species/SpeciesSections';
import { useSpeciesInfo } from '@/components/species/useSpeciesInfo';
import type { PlantCandidate } from '@/types';

function parseCandidates(raw: string | string[] | undefined): PlantCandidate[] {
  if (!raw || Array.isArray(raw)) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlantCandidate[]) : [];
  } catch {
    return [];
  }
}

function useRetakePhoto() {
  const router = useRouter();
  return () => router.replace({ pathname: '/identify/capture', params: { mode: 'identify' } });
}

function NoCandidates() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');
  const retake = useRetakePhoto();

  return (
    <View style={[styles.container, styles.empty]}>
      <EmptyState icon={Leaf} message={t('notFoundMessage')} />
      <OutlineButton label={t('retakePhotoCta')} icon={Camera} onPress={retake} style={styles.emptyAction} />
      <FloatingScreenControls />
    </View>
  );
}

export default function IdentifyResultScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('identify');
  const params = useLocalSearchParams<{ candidates: string; source?: string }>();
  const candidates = useMemo(() => parseCandidates(params.candidates), [params.candidates]);
  const isFromPhoto = params.source !== 'catalog';
  const scrollRef = useRef<ScrollView>(null);
  const retake = useRetakePhoto();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = candidates[selectedIndex];
  const speciesQuery = useSpeciesInfo(selected?.scientificName ?? null, selected?.commonName ?? null);
  const adding = useAddIdentifiedPlant(selected, speciesQuery.data ?? null);

  if (!selected) return <NoCandidates />;

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: Metrics.size.hero + insets.bottom }}>
        <PhotoPager
          photoUrls={selected.imageUrl ? [selected.imageUrl] : []}
          placeholderIcon={Leaf}
          fullWidth
          overlay={<PhotoBadge label={isFromPhoto ? t('yourPhotoLabel') : t('referencePhotosCaption')} color={Overlays.scrimMedium} />}
        />
        <View style={styles.content}>
          <CandidateHeader
            candidate={selected}
            plantType={speciesQuery.data?.plantType ?? null}
            showConfidence={isFromPhoto}
            onRetake={retake}
          />
          <ReferencePhotosStrip query={speciesQuery} />
          <CandidateAlternatives
            candidates={candidates}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            onRetake={isFromPhoto ? retake : null}
          />
          <SpeciesSections query={speciesQuery} />
        </View>
      </ScrollView>

      <FloatingScreenControls />

      <View style={[styles.submitBar, { paddingBottom: insets.bottom + Metrics.spacing.md }]}>
        <SubmitButton label={t('addToGardenCta')} onPress={adding.open} />
      </View>

      <PromptModal
        {...adding.promptProps}
        title={t('nicknameModalTitle')}
        label={t('nicknameLabel')}
        placeholder={t('nicknamePlaceholder')}
        submitLabel={t('saveToGardenCta')}
      />
      <NewBadgeModal {...adding.badgeProps} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    empty: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Metrics.spacing.xl,
    },
    emptyAction: {
      marginTop: Metrics.spacing.lg,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    submitBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
