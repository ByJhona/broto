import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dna, Droplet, Leaf, Percent, Sun } from 'lucide-react-native';
import { Colors, Metrics, Overlays } from '@/theme';
import {
  FormError,
  FormField,
  InfoChip,
  PlantHero,
  SectionTitle,
  SpeciesInfoSection,
  SpeciesInfoSkeleton,
  SubmitButton,
} from '@/components';
import { useAuth, usePlants } from '@/hooks';
import { getPlantSpeciesInfo } from '@/services';
import type { PlantCandidate, PlantSpeciesInfo } from '@/types';
import { requireLogin, sunLevelLabel, type SunLevel } from '@/utils';

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
  const { session } = useAuth();
  const { addPlant } = usePlants();
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
    if (!requireLogin(router, !!session, 'Você precisa de uma conta pra salvar plantas no seu jardim.')) {
      return;
    }
    setError(null);
    setIsNicknameModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Dá um apelido pra sua planta.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const plant = await addPlant({
        name: name.trim(),
        species: selected.scientificName,
        commonName: selected.commonName,
        wateringDays: wateringDays.trim() ? Number(wateringDays) : null,
        photoUrl: selected.imageUrl,
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
      router.replace(`/plant/${plant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a planta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selected) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Não conseguimos identificar nenhuma planta nessa foto. Tente outra imagem, de perto da folha ou da flor.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {selected.imageUrl ? (
          <PlantHero
            photoUrl={selected.imageUrl}
            name={selected.commonName ?? selected.scientificName}
            species={selected.scientificName}
          />
        ) : (
          <>
            <View style={styles.heroPlaceholder}>
              <Leaf size={Metrics.icon.xl} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
            <View style={styles.plainHeader}>
              <Text style={styles.plainHeaderName}>{selected.commonName ?? selected.scientificName}</Text>
              <Text style={styles.plainHeaderSpecies}>{selected.scientificName}</Text>
            </View>
          </>
        )}

        <View style={styles.content}>
          <View style={styles.section}>
            <SectionTitle>Cuidados sugeridos</SectionTitle>
            <View style={styles.chipRow}>
              <InfoChip icon={Droplet} value={`Regar a cada ${wateringDays || '—'} dias`} />
              {lightLevel ? <InfoChip icon={Sun} value={sunLevelLabel(lightLevel)} /> : null}
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle>Identificação</SectionTitle>
            <View style={styles.chipRow}>
              <InfoChip icon={Percent} value={`${Math.round(selected.score * 100)}% de confiança`} />
              {selected.family ? <InfoChip icon={Leaf} value={selected.family} /> : null}
              {selected.genus ? <InfoChip icon={Dna} value={selected.genus} /> : null}
            </View>
          </View>

          {candidates.length > 1 ? (
            <View style={styles.section}>
              <SectionTitle>Não é essa? Outras possibilidades</SectionTitle>
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
        </View>
      </ScrollView>

      <View style={styles.floatingButton}>
        <SubmitButton label="Adicionar ao meu jardim" onPress={handleOpenNicknameModal} />
      </View>

      <Modal
        visible={isNicknameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNicknameModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como você quer chamar essa planta?</Text>
            <FormField label="Apelido" value={name} onChangeText={setName} placeholder="Samba" autoFocus />
            <FormError>{error}</FormError>
            <SubmitButton label="Salvar no meu jardim" onPress={handleSubmit} loading={isSubmitting} />
            <Pressable
              style={styles.modalCancel}
              onPress={() => setIsNicknameModalOpen(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Metrics.spacing.xl,
    backgroundColor: Colors.background,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  heroPlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainHeader: {
    alignItems: 'center',
    paddingTop: Metrics.spacing.lg,
  },
  plainHeaderName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
  },
  plainHeaderSpecies: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  content: {
    padding: Metrics.spacing.lg,
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
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    marginBottom: Metrics.spacing.xs,
  },
  alternateName: {
    fontSize: 14,
    color: Colors.foreground,
  },
  alternateScore: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  floatingButton: {
    position: 'absolute',
    left: Metrics.spacing.lg,
    right: Metrics.spacing.lg,
    bottom: Metrics.spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Overlays.scrim,
    padding: Metrics.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.md,
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: Metrics.spacing.sm,
    padding: Metrics.spacing.sm,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
});
