import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import MapPin from 'lucide-react-native/icons/map-pin';
import PawPrint from 'lucide-react-native/icons/paw-print';
import SignalHigh from 'lucide-react-native/icons/signal-high';
import SignalLow from 'lucide-react-native/icons/signal-low';
import SignalMedium from 'lucide-react-native/icons/signal-medium';
import Sun from 'lucide-react-native/icons/sun';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card, EmptyState, InfoChip, LoadingScreen, OwnerRow, PlantHero, ScreenContent, SpeciesInfoSection } from '@/components';
import { useAuth } from '@/hooks';
import {
  applyProposalStatusEverywhere,
  getProposalById,
  patchListingInAllCaches,
  respondToProposal,
  type OfferedPlantDetail,
} from '@/services';
import { LISTING_STATUS, OFFER_STATUS, type OfferStatus, type Plant } from '@/types';
import { sunLevelLabel, Toast } from '@/utils';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const ACTIONS_BAR_HEIGHT = 76;
const PLANT_HERO_HEIGHT = 340;

const CARE_LEVEL_LABEL_KEY: Record<NonNullable<Plant['careLevel']>, string> = {
  easy: 'plant:careLevelEasy',
  moderate: 'plant:careLevelModerate',
  hard: 'plant:careLevelHard',
};

const CARE_LEVEL_ICON: Record<NonNullable<Plant['careLevel']>, LucideIcon> = {
  easy: SignalLow,
  moderate: SignalMedium,
  hard: SignalHigh,
};

const STATUS_LABEL_KEY = {
  pending: 'listing:proposalStatusPending',
  accepted: 'listing:proposalStatusAccepted',
  declined: 'listing:proposalStatusDeclined',
} as const;

type StatTile = { key: string; icon: LucideIcon; value: string };

function buildCareStats(plant: OfferedPlantDetail, t: TranslateFn): StatTile[] {
  const stats: StatTile[] = [];
  if (plant.wateringDays != null) {
    stats.push({ key: 'watering', icon: Droplet, value: t('plant:wateringEveryDays', { days: plant.wateringDays }) });
  }
  if (plant.sunLevel != null) {
    stats.push({ key: 'light', icon: Sun, value: sunLevelLabel(plant.sunLevel) });
  }
  if (plant.origin) stats.push({ key: 'origin', icon: MapPin, value: plant.origin });
  if (plant.careLevel) {
    stats.push({ key: 'careLevel', icon: CARE_LEVEL_ICON[plant.careLevel], value: t(CARE_LEVEL_LABEL_KEY[plant.careLevel]) });
  }
  if (plant.toxicToPets != null) {
    stats.push({ key: 'petSafety', icon: PawPrint, value: t(plant.toxicToPets ? 'plant:notSafeForPets' : 'plant:safeForPets') });
  }
  return stats;
}

type OfferedPlantHeroProps = {
  plant: OfferedPlantDetail;
  styles: Styles;
  colors: ThemeColors;
};

function OfferedPlantHero({ plant, styles, colors }: Readonly<OfferedPlantHeroProps>) {
  const photoUrl = plant.photoUrls[0];
  if (!photoUrl) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <Leaf size={40} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
    );
  }

  return <PlantHero photoUrl={photoUrl} name={plant.name} species={plant.commonName ?? plant.species} />;
}

type OfferStatusLabelProps = {
  status: OfferStatus;
  styles: Styles;
  t: TranslateFn;
};

function OfferStatusLabel({ status, styles, t }: Readonly<OfferStatusLabelProps>) {
  return <Text style={styles.statusLabel}>{t(STATUS_LABEL_KEY[status])}</Text>;
}

type OfferActionsBarProps = {
  isResponding: boolean;
  onRespond: (accept: boolean) => void;
  bottomInset: number;
  styles: Styles;
  t: TranslateFn;
};

function OfferActionsBar({ isResponding, onRespond, bottomInset, styles, t }: Readonly<OfferActionsBarProps>) {
  return (
    <View style={[styles.actions, { paddingBottom: bottomInset + Metrics.spacing.md }]}>
      <Pressable style={styles.declineButton} onPress={() => onRespond(false)} disabled={isResponding}>
        <Text style={styles.declineButtonText}>{t('listing:declineAction')}</Text>
      </Pressable>
      <Pressable style={styles.acceptButton} onPress={() => onRespond(true)} disabled={isResponding}>
        {isResponding ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.acceptButtonText}>{t('listing:acceptAction')}</Text>
        )}
      </Pressable>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['offer', 'plant', 'listing', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState(false);

  const proposalQuery = useQuery({
    queryKey: ['proposal-detail', id],
    queryFn: () => getProposalById(id!),
    enabled: !!id,
  });

  const proposal = proposalQuery.data;

  const handleRespond = async (accept: boolean) => {
    if (!proposal) return;

    setIsResponding(true);
    try {
      const updatedProposal = await respondToProposal(proposal.id, accept);
      applyProposalStatusEverywhere(queryClient, updatedProposal, user?.id);
      if (accept) {
        patchListingInAllCaches(queryClient, updatedProposal.listingId, (listing) => ({ ...listing, status: LISTING_STATUS.COMPLETED }));
      }
      Toast.success(t(accept ? 'offer:acceptSuccess' : 'offer:declineSuccess'));
      if (accept) {
        router.push({ pathname: '/chat', params: { otherUserId: proposal.senderId } });
      } else {
        router.back();
      }
    } catch {
      Toast.error(t('offer:respondError'));
    } finally {
      setIsResponding(false);
    }
  };

  if (proposalQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!proposal || !proposal.offeredPlant) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon={Leaf} message={t('offer:notFoundMessage')} />
      </View>
    );
  }

  const plant = proposal.offeredPlant;
  const careStats = buildCareStats(plant, t);
  const senderName = proposal.senderName ?? t('common:someone');
  const isPending = proposal.status === OFFER_STATUS.PENDING;
  const canRespond = isPending && user?.id === proposal.recipientId;

  const handlePressSender = () => {
    router.push({ pathname: '/profile/[id]', params: { id: proposal.senderId } });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: (canRespond ? ACTIONS_BAR_HEIGHT + insets.bottom : 0) + Metrics.spacing.xl }}
      >
        <Stack.Screen options={{ title: t('offer:screenTitle') }} />

        <OfferedPlantHero plant={plant} styles={styles} colors={colors} />

        <ScreenContent style={styles.content}>
          <Card>
            <OwnerRow
              eyebrow={t('listing:offeredBy')}
              ownerName={senderName}
              ownerAvatarUrl={proposal.senderAvatarUrl}
              onPress={handlePressSender}
            />
            {proposal.listingTitle ? <Text style={styles.context}>{t('offer:wantsToTradeFor', { listingTitle: proposal.listingTitle })}</Text> : null}
          </Card>

          {careStats.length > 0 ? (
            <Card>
              <View style={styles.statsRow}>
                {careStats.map((stat) => (
                  <InfoChip key={stat.key} icon={stat.icon} value={stat.value} />
                ))}
              </View>
            </Card>
          ) : null}

          {plant.description ? (
            <SpeciesInfoSection
              info={{
                description: plant.description,
                wateringDescription: plant.wateringDescription,
                toxicToPets: plant.toxicToPets ?? false,
                toxicToPetsNotes: plant.toxicToPetsNotes,
                toxicToHumans: plant.toxicToHumans ?? false,
                toxicToHumansNotes: plant.toxicToHumansNotes,
                funFacts: plant.funFacts ?? [],
                commonProblems: plant.commonProblems ?? [],
              }}
            />
          ) : null}

          {canRespond ? null : <OfferStatusLabel status={proposal.status} styles={styles} t={t} />}
        </ScreenContent>
      </ScrollView>

      {canRespond ? (
        <OfferActionsBar isResponding={isResponding} onRespond={handleRespond} bottomInset={insets.bottom} styles={styles} t={t} />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      gap: Metrics.spacing.lg,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: Metrics.spacing.xl,
    },
    photo: {
      height: PLANT_HERO_HEIGHT,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    context: {
      fontSize: 13,
      color: colors.foreground,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.sm,
    },
    actions: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.lg,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    declineButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
    },
    declineButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.destructive,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
    },
    acceptButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    statusLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
