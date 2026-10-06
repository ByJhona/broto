import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { BottomBar, EmptyState, FloatingScreenControls, LoadingScreen, OwnerRow, PageTitle, PhotoPager, ProposalResponseActions, ScientificName, ScreenContent } from '@/components';
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
import { confirmCloseListing, Toast } from '@/utils';

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
        {plant.species ? <ScientificName name={plant.species} /> : null}
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

    const closeListing = accept ? await confirmCloseListing() : false;
    if (closeListing === null) return;
    setIsResponding(true);
    try {
      const updatedProposal = await respondToProposal(proposal.id, accept, closeListing);
      applyProposalStatusEverywhere(queryClient, updatedProposal, user?.id);
      if (closeListing) {
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
        <BottomBar>
          <ProposalResponseActions loading={isResponding} onAccept={() => handleRespond(true)} onDecline={() => handleRespond(false)} />
        </BottomBar>
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
    ownerRow: {
      marginBottom: Metrics.spacing.sm,
    },
    context: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    statusLabel: {
      ...Typography.label,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
