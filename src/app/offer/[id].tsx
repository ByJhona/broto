import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, FloatingScreenControls, LoadingScreen, OwnerRow, PageTitle, PhotoPager, ScreenContent } from '@/components';
import { SpeciesSections } from '@/components/species/SpeciesSections';
import { useSpeciesInfo } from '@/components/species/useSpeciesInfo';
import { useAuth } from '@/hooks';
import {
  applyProposalStatusEverywhere,
  getProposalById,
  patchListingInAllCaches,
  respondToProposal,
  type OfferedPlantDetail,
} from '@/services';
import { LISTING_STATUS, OFFER_STATUS, type OfferStatus } from '@/types';
import { Toast } from '@/utils';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;


const STATUS_LABEL_KEY = {
  pending: 'listing:proposalStatusPending',
  accepted: 'listing:proposalStatusAccepted',
  declined: 'listing:proposalStatusDeclined',
} as const;

type OfferedPlantHeroProps = {
  plant: OfferedPlantDetail;
  styles: Styles;
};

function OfferedPlantHero({ plant, styles }: Readonly<OfferedPlantHeroProps>) {
  const showCommonName = !!plant.commonName && plant.commonName !== plant.name;
  return (
    <>
      <PhotoPager photoUrls={plant.photoUrls} placeholderIcon={Leaf} fullWidth recyclingKey={plant.id} />
      <View style={styles.titleBlock}>
        <PageTitle>{plant.name}</PageTitle>
        {showCommonName ? <Text style={styles.commonName}>{plant.commonName}</Text> : null}
        {plant.species ? <Text style={styles.species}>{plant.species}</Text> : null}
      </View>
    </>
  );
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
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
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
  const offeredPlant = proposal?.offeredPlant ?? null;
  const speciesQuery = useSpeciesInfo(offeredPlant?.species ?? null, offeredPlant?.commonName ?? null);

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
    return (
      <View style={styles.root}>
        <LoadingScreen />
        <FloatingScreenControls />
      </View>
    );
  }

  if (!proposal || !proposal.offeredPlant) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={Leaf} message={t('offer:notFoundMessage')} />
        <FloatingScreenControls />
      </View>
    );
  }

  const plant = proposal.offeredPlant;
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
        contentContainerStyle={{ paddingBottom: (canRespond ? Metrics.size.xxl + insets.bottom : 0) + Metrics.spacing.xl }}
      >
        <OfferedPlantHero plant={plant} styles={styles} />

        <ScreenContent style={styles.content}>
          <View>
            <OwnerRow
              eyebrow={t('listing:offeredBy')}
              ownerName={senderName}
              ownerAvatarUrl={proposal.senderAvatarUrl}
              onPress={handlePressSender}
              style={styles.ownerRow}
            />
            {proposal.listingTitle ? <Text style={styles.context}>{t('offer:wantsToTradeFor', { listingTitle: proposal.listingTitle })}</Text> : null}
          </View>

          {plant.species ? <SpeciesSections query={speciesQuery} /> : null}

          {canRespond ? null : <OfferStatusLabel status={proposal.status} styles={styles} t={t} />}
        </ScreenContent>
      </ScrollView>

      {canRespond ? (
        <OfferActionsBar isResponding={isResponding} onRespond={handleRespond} bottomInset={insets.bottom} styles={styles} t={t} />
      ) : null}
      <FloatingScreenControls />
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
    titleBlock: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    title: {
      ...Typography.display,
      color: colors.foreground,
    },
    commonName: {
      ...Typography.body,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    species: {
      ...Typography.body,
      fontStyle: 'italic',
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    ownerRow: {
      marginBottom: Metrics.spacing.sm,
    },
    context: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
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
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
    },
    declineButtonText: {
      ...Typography.headingMedium,
      color: colors.destructive,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
    },
    acceptButtonText: {
      ...Typography.headingMedium,
      color: colors.primaryForeground,
    },
    statusLabel: {
      ...Typography.label,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
