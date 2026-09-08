import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { useCreditsGate } from '@/hooks';
import { analyzePlantGrowth, CREDIT_COSTS, getPlantGrowthCheckins, InsufficientCreditsError } from '@/services';
import type { Plant, PlantGrowthCheckin } from '@/types';
import { Alert, formatShortDate, Toast } from '@/utils';
import { LockedFeatureCard } from './LockedFeatureCard';
import { SectionTitle } from './SectionTitle';
import { SkeletonBlock } from './Skeleton';

const GROWTH_ANALYSIS_CREDIT_COST = CREDIT_COSTS.growth_check;

type PlantGrowthSectionProps = {
  plant: Plant;
  isPremium: boolean;
};

export function PlantGrowthSection({ plant, isPremium }: PlantGrowthSectionProps) {
  const router = useRouter();
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const [checkins, setCheckins] = useState<PlantGrowthCheckin[]>([]);
  const [isCheckinsLoading, setIsCheckinsLoading] = useState(true);
  const [expandedCheckinId, setExpandedCheckinId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getPlantGrowthCheckins(plant.id).then((result) => {
      if (!isMounted) return;
      setCheckins(result);
      setExpandedCheckinId(result[0]?.id ?? null);
      setIsCheckinsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [plant.id]);

  const showInsufficientCreditsAlert = () => {
    Alert.alert(
      'Créditos insuficientes',
      `Essa análise custa ${GROWTH_ANALYSIS_CREDIT_COST} créditos. Veja os planos pra continuar.`,
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ver planos', onPress: () => router.push('/profile/plans') },
      ]
    );
  };

  const handleAnalyzeGrowth = () => {
    if (!canAffordCost(GROWTH_ANALYSIS_CREDIT_COST)) {
      showInsufficientCreditsAlert();
      return;
    }

    const runAnalysis = async (source: 'camera' | 'gallery') => {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

      if (result.canceled) return;

      setIsAnalyzing(true);
      try {
        const { checkin, newCreditBalance } = await analyzePlantGrowth(plant.id, result.assets[0].uri);
        applyCreditBalance(newCreditBalance);
        setCheckins((current) => [checkin, ...current]);
        setExpandedCheckinId(checkin.id);
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          showInsufficientCreditsAlert();
        } else {
          Toast.error(err instanceof Error ? err.message : 'Não foi possível analisar a foto.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    Alert.alert('Analisar planta', undefined, [
      { text: 'Tirar foto', onPress: () => runAnalysis('camera') },
      { text: 'Escolher da galeria', onPress: () => runAnalysis('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.section}>
      <SectionTitle>{`Evolução da ${plant.name}`}</SectionTitle>
      {!isPremium ? (
        <LockedFeatureCard message="Acompanhe a evolução dessa planta com fotos analisadas pela IA ao longo do tempo — um recurso do plano Premium." />
      ) : (
        <>
          <Pressable style={styles.analyzeButton} onPress={handleAnalyzeGrowth} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <ActivityIndicator color={Colors.primaryForeground} size="small" />
            ) : (
              <Camera size={16} color={Colors.primaryForeground} strokeWidth={2} />
            )}
            <Text style={styles.analyzeButtonText}>
              {isAnalyzing ? 'Analisando...' : `Analisar minha planta · ${GROWTH_ANALYSIS_CREDIT_COST} créditos`}
            </Text>
          </Pressable>

          {isCheckinsLoading ? (
            <>
              <SkeletonBlock height={160} radius={Metrics.radius.lg} style={styles.skeletonSpacing} />
              <SkeletonBlock height={160} radius={Metrics.radius.lg} />
            </>
          ) : checkins.length === 0 ? (
            <Text style={styles.emptyCheckinsText}>Nenhuma análise ainda. Toque no botão acima pra começar.</Text>
          ) : (
            checkins.map((checkin) => {
              const isExpanded = checkin.id === expandedCheckinId;
              return (
                <View key={checkin.id} style={styles.checkinCard}>
                  <Pressable
                    style={styles.checkinHeader}
                    onPress={() => setExpandedCheckinId(isExpanded ? null : checkin.id)}
                  >
                    <Text style={styles.checkinDate}>{formatShortDate(checkin.createdAt)}</Text>
                    {isExpanded ? (
                      <ChevronUp size={16} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
                    ) : (
                      <ChevronDown size={16} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
                    )}
                  </Pressable>
                  {isExpanded ? (
                    <>
                      <Image source={{ uri: checkin.photoUrl }} style={styles.checkinPhoto} contentFit="cover" />
                      <View style={styles.checkinContent}>
                        {checkin.observations.map((observation) => (
                          <View key={observation} style={styles.checkinObservationRow}>
                            <View style={styles.checkinBullet} />
                            <Text style={styles.checkinObservationText}>{observation}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.lg,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    marginBottom: Metrics.spacing.md,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
  emptyCheckinsText: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  skeletonSpacing: {
    marginBottom: Metrics.spacing.sm,
  },
  checkinCard: {
    backgroundColor: Colors.background,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Metrics.spacing.md,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Metrics.spacing.md,
  },
  checkinPhoto: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.muted,
  },
  checkinContent: {
    padding: Metrics.spacing.md,
  },
  checkinDate: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  checkinObservationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.xs,
    marginBottom: 2,
  },
  checkinBullet: {
    width: 5,
    height: 5,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.leaf,
    marginTop: 6,
  },
  checkinObservationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.foreground,
  },
});
