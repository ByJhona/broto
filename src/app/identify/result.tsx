import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Dna from 'lucide-react-native/icons/dna';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import Percent from 'lucide-react-native/icons/percent';
import Sun from 'lucide-react-native/icons/sun';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  EmptyState,
  InfoChip,
  NewBadgeModal,
  PromptModal,
  ScreenContent,
  SectionTitle,
  SpeciesInfoSection,
  SpeciesInfoSkeleton,
  SpeciesPhotoHero,
  SubmitButton,
} from '@/components';
import { useAuth, usePlants } from '@/hooks';
import { checkNewlyEarnedBadge, getPlantSpeciesInfo } from '@/services';
import type { Badge, PlantCandidate, PlantSpeciesInfo } from '@/types';
import { requireLogin, sunLevelLabel, type SunLevel } from '@/utils';
import { useTranslation } from '@/i18n';

function parseCandidates(raw: string | string[] | undefined): PlantCandidate[] {
  if (!raw || Array.isArray(raw)) return [];
  try {
    return JSON.parse(raw) as PlantCandidate[];
  } catch {
    return [];
  }
}

export default function IdentifyResultScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, user } = useAuth();
  const { addPlant } = usePlants();
  const { t } = useTranslation('identify');
  const params = useLocalSearchParams<{ candidates: string }>();
  const candidates = useMemo(() => parseCandidates(params.candidates), [params.candidates]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = candidates[selectedIndex];

  const [name, setName] = useState(selected ? selected.commonName ?? selected.scientificName : '');
  const [wateringDays, setWateringDays] = useState('3');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [speciesInfo, setSpeciesInfo] = useState<PlantSpeciesInfo | null>(null);
  const [lightLevel, setLightLevel] = useState<SunLevel | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [addedPlantId, setAddedPlantId] = useState<string | null>(null);

  const isSpeciesInfoStale = !selected || speciesInfo?.scientificName !== selected.scientificName;

  const applyCareInfo = (info: PlantSpeciesInfo | null) => {
    setSpeciesInfo(info);
    setLightLevel(info?.sunLevel ?? null);
    if (info) {
      setWateringDays(String(Math.round((info.wateringDaysMin + info.wateringDaysMax) / 2)));
    }
  };

  useEffect(() => {
    if (!selected) return;

    let isCancelled = false;

    getPlantSpeciesInfo(selected.scientificName, selected.commonName).then((info) => {
      if (!isCancelled) {
        applyCareInfo(info);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selected]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const candidate = candidates[index];
    setName(candidate.commonName ?? candidate.scientificName);
  };

  const handleOpenNicknameModal = () => {
    if (!requireLogin(router, !!session, t('loginRequiredMessage'))) {
      return;
    }
    setError(null);
    setIsNicknameModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('missingNicknameError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const earnedBadge = user?.id ? await checkNewlyEarnedBadge(user.id, selected.scientificName) : null;

      const plant = await addPlant({
        name: name.trim(),
        species: selected.scientificName,
        commonName: selected.commonName,
        wateringDays: wateringDays.trim() ? Number(wateringDays) : null,
        photoUrl: speciesInfo?.referencePhotos[0]?.url ?? null,
        sunLevel: lightLevel,
        origin: speciesInfo?.origin ?? null,
        description: speciesInfo?.description ?? null,
        wateringDescription: speciesInfo?.wateringDescription ?? null,
        careLevel: speciesInfo?.careLevel ?? null,
        toxicToPets: speciesInfo?.toxicToPets ?? null,
        toxicToPetsNotes: speciesInfo?.toxicToPetsNotes ?? null,
        toxicToHumans: speciesInfo?.toxicToHumans ?? null,
        toxicToHumansNotes: speciesInfo?.toxicToHumansNotes ?? null,
        funFacts: speciesInfo?.funFacts ?? null,
        commonProblems: speciesInfo?.commonProblems ?? null,
      });

      if (earnedBadge) {
        setIsNicknameModalOpen(false);
        setAddedPlantId(plant.id);
        setNewBadge(earnedBadge);
      } else {
        router.replace(`/plant/${plant.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimBadge = () => {
    setNewBadge(null);
    router.replace(user?.id ? `/profile/${user.id}` : `/plant/${addedPlantId}`);
  };

  const handleCloseBadgeModal = () => {
    setNewBadge(null);
    router.replace(`/plant/${addedPlantId}`);
  };

  if (!selected) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState icon={Leaf} message={t('notFoundMessage')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SpeciesPhotoHero
          photos={speciesInfo?.referencePhotos ?? []}
          isLoading={isSpeciesInfoStale}
          name={selected.commonName ?? selected.scientificName}
          species={selected.scientificName}
        />

        <ScreenContent>
          <View style={styles.section}>
            <SectionTitle>{t('suggestedCareTitle')}</SectionTitle>
            <View style={styles.chipRow}>
              <InfoChip icon={Droplet} value={t('wateringEvery', { days: wateringDays || '—' })} />
              {lightLevel ? <InfoChip icon={Sun} value={sunLevelLabel(lightLevel)} /> : null}
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('identificationSectionTitle')}</SectionTitle>
            <View style={styles.chipRow}>
              <InfoChip icon={Percent} value={t('confidencePercent', { percent: Math.round(selected.score * 100) })} />
              {selected.family ? <InfoChip icon={Leaf} value={selected.family} /> : null}
              {selected.genus ? <InfoChip icon={Dna} value={selected.genus} /> : null}
            </View>
          </View>

          {candidates.length > 1 ? (
            <View style={styles.section}>
              <SectionTitle>{t('otherPossibilitiesTitle')}</SectionTitle>
              {candidates.map((candidate, index) =>
                index === selectedIndex ? null : (
                  <Pressable
                    key={candidate.scientificName}
                    style={styles.alternateRow}
                    onPress={() => handleSelect(index)}
                  >
                    <Text style={styles.alternateName}>{candidate.commonName ?? candidate.scientificName}</Text>
                    <Text style={styles.alternateScore}>{Math.round(candidate.score * 100)}%</Text>
                  </Pressable>
                )
              )}
            </View>
          ) : null}

          {!isSpeciesInfoStale && speciesInfo ? (
            <SpeciesInfoSection info={speciesInfo} />
          ) : (
            <SpeciesInfoSkeleton />
          )}
        </ScreenContent>
      </KeyboardAwareScrollView>

      <View style={[styles.floatingButton, { bottom: insets.bottom + Metrics.spacing.lg }]}>
        <SubmitButton label={t('addToGardenCta')} onPress={handleOpenNicknameModal} />
      </View>

      <PromptModal
        visible={isNicknameModalOpen}
        title={t('nicknameModalTitle')}
        label={t('nicknameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('nicknamePlaceholder')}
        error={error}
        submitLabel={t('saveToGardenCta')}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => setIsNicknameModalOpen(false)}
      />

      <NewBadgeModal badge={newBadge} onClaim={handleClaimBadge} onClose={handleCloseBadgeModal} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Metrics.spacing.xl,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: Metrics.spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
  alternateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    marginBottom: Metrics.spacing.xs,
  },
  alternateName: {
    fontSize: 14,
    color: colors.foreground,
  },
  alternateScore: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  floatingButton: {
    position: 'absolute',
    left: Metrics.spacing.lg,
    right: Metrics.spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  });
