import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import Leaf from 'lucide-react-native/icons/leaf';
import MapPin from 'lucide-react-native/icons/map-pin';
import Pencil from 'lucide-react-native/icons/pencil';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  Card,
  EmptyState,
  ExchangePlantPickerModal,
  ListingActionFooter,
  ListingPhotoGallery,
  ListingProposalsSection,
  LoadingScreen,
  OwnerRow,
  PromptModal,
  ScreenContent,
  SectionTitle,
  type ListingProposal,
} from '@/components';
import { useAuth, useListings, usePlants } from '@/hooks';
import {
  createPost,
  getListingById,
  getListingInterests,
  getListingOfferProposals,
  hasExpressedInterest,
  hasProposedOffer,
  respondToInterest,
  respondToOffer,
  sendOfferMessage,
  type ListingInterest,
  type ListingOfferProposal,
} from '@/services';
import {
  Alert,
  confirm,
  formatPrice,
  listingShareVerb,
  listingStatusNotice,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  listingTypeLabel,
  Toast,
  type AlertButton,
} from '@/utils';
import { LISTING_STATUS, LISTING_TYPE, OFFER_STATUS, type ListingStatus, type PlantSummary } from '@/types';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function fetchMyListingAction(isExchange: boolean, listingId: string, userId: string): Promise<boolean> {
  return isExchange ? hasProposedOffer(listingId, userId) : hasExpressedInterest(listingId, userId);
}

type ListingActionHandlers = {
  onMarkCompleted: () => void;
  onMarkExpired: () => void;
  onReactivate: () => void;
  onShare: () => void;
  onDelete: () => void;
};

function buildListingActionButtons(status: ListingStatus, handlers: ListingActionHandlers, t: TranslateFn): AlertButton[] {
  const buttons: AlertButton[] = [];
  if (status === LISTING_STATUS.AVAILABLE) {
    buttons.push({ text: t('markCompletedAction'), onPress: handlers.onMarkCompleted });
    buttons.push({ text: t('markExpiredAction'), onPress: handlers.onMarkExpired });
  }
  if (status === LISTING_STATUS.EXPIRED) {
    buttons.push({ text: t('reactivateListingAction'), onPress: handlers.onReactivate });
  }
  buttons.push({ text: t('shareToCommunityAction'), onPress: handlers.onShare });
  buttons.push({ text: t('deleteListingAction'), style: 'destructive', onPress: handlers.onDelete });
  buttons.push({ text: t('common:close'), style: 'cancel' });
  return buttons;
}

type ListingStatusNoticeProps = {
  status: ListingStatus;
  style: StyleProp<TextStyle>;
};

function ListingStatusNotice({ status, style }: Readonly<ListingStatusNoticeProps>) {
  if (status === LISTING_STATUS.AVAILABLE) return null;
  return <Text style={style}>{listingStatusNotice(status)}</Text>;
}

type ListingProposalsBlockProps = {
  isOwner: boolean;
  isExchange: boolean;
  proposals: ListingProposal[];
  onOpenChat: (userId: string) => void;
};

function ListingProposalsBlock({ isOwner, isExchange, proposals, onOpenChat }: Readonly<ListingProposalsBlockProps>) {
  const { t } = useTranslation('listing');
  if (!isOwner) return null;

  return (
    <ListingProposalsSection
      title={isExchange ? t('exchangeProposalsTitle') : t('interestedPeopleTitle')}
      emptyMessage={isExchange ? t('noExchangeProposals') : t('noInterestedPeople')}
      proposals={proposals}
      onOpenChat={onOpenChat}
    />
  );
}

function buildProposals(
  isExchange: boolean,
  interests: ListingInterest[] | undefined,
  offers: ListingOfferProposal[] | undefined,
  onRespondInterest: (interestId: string, accept: boolean) => void,
  onRespondOffer: (messageId: string, accept: boolean) => void,
  t: TranslateFn
): ListingProposal[] {
  if (isExchange) {
    return (offers ?? []).map((offer) => ({
      id: offer.id,
      userId: offer.senderId,
      name: offer.senderName,
      avatarUrl: offer.senderAvatarUrl,
      detail: offer.offeredPlantName ? t('offeredPlantDetail', { plantName: offer.offeredPlantName }) : null,
      status: offer.status,
      onAccept: offer.status === OFFER_STATUS.PENDING ? () => onRespondOffer(offer.id, true) : undefined,
      onDecline: offer.status === OFFER_STATUS.PENDING ? () => onRespondOffer(offer.id, false) : undefined,
    }));
  }

  return (interests ?? []).map((interest) => ({
    id: interest.id,
    userId: interest.userId,
    name: interest.name,
    avatarUrl: interest.avatarUrl,
    detail: interest.message,
    status: interest.status,
    onAccept: interest.status === OFFER_STATUS.PENDING ? () => onRespondInterest(interest.id, true) : undefined,
    onDecline: interest.status === OFFER_STATUS.PENDING ? () => onRespondInterest(interest.id, false) : undefined,
  }));
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['listing', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setListingStatus, removeListing, sendInterest } = useListings();
  const { plants } = usePlants();
  const [hasActedThisSession, setHasActedThisSession] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isPlantPickerOpen, setIsPlantPickerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const listingQuery = useQuery({
    queryKey: ['plant-listing', id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });

  const listing = listingQuery.data;
  const isOwner = !!user && listing?.userId === user.id;
  const isExchange = listing?.listingType === LISTING_TYPE.EXCHANGE;

  const interestsQuery = useQuery({
    queryKey: ['plant-listing-interests', id],
    queryFn: () => getListingInterests(id),
    enabled: !!id && isOwner && !isExchange,
  });

  const offersQuery = useQuery({
    queryKey: ['plant-listing-offers', id],
    queryFn: () => getListingOfferProposals(id),
    enabled: !!id && isOwner && isExchange,
  });

  const myActionQuery = useQuery({
    queryKey: ['plant-listing-my-action', id, user?.id, isExchange],
    queryFn: () => fetchMyListingAction(isExchange, id, user!.id),
    enabled: !!id && !!user && !isOwner,
  });

  const hasSentInterest = hasActedThisSession || !!myActionQuery.data;

  const addressQuery = useQuery({
    queryKey: ['listing-address', listing?.latitude, listing?.longitude],
    queryFn: async () => {
      const [result] = await Location.reverseGeocodeAsync({ latitude: listing!.latitude, longitude: listing!.longitude });
      if (!result) return null;
      return [result.street, result.subregion || result.city, result.region].filter(Boolean).join(', ') || null;
    },
    enabled: !!listing,
    staleTime: Infinity,
  });

  if (listingQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!listing) {
    return <EmptyState icon={Leaf} title={t('notFoundTitle')} message={t('notFoundMessage')} />;
  }

  const handleInterest = async () => {
    setIsActing(true);
    try {
      await sendInterest({ listingId: listing.id });
      setHasActedThisSession(true);
      Toast.success(t('interestSentSuccess'));
      handleOpenChat(listing.userId);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('interestSentError'));
    } finally {
      setIsActing(false);
    }
  };

  const handleOpenChat = (otherUserId: string) => {
    router.push({ pathname: '/chat', params: { otherUserId } });
  };

  const invalidateProposals = () => {
    queryClient.invalidateQueries({ queryKey: ['plant-listing-interests', id] });
    queryClient.invalidateQueries({ queryKey: ['plant-listing-offers', id] });
    queryClient.invalidateQueries({ queryKey: ['plant-listing', id] });
  };

  const handleRespondInterest = async (interestId: string, accept: boolean) => {
    try {
      await respondToInterest(interestId, listing.id, accept);
      invalidateProposals();
    } catch {
      Toast.error(t('interestUpdateError'));
    }
  };

  const handleRespondOffer = async (messageId: string, accept: boolean) => {
    try {
      await respondToOffer(messageId, accept);
      invalidateProposals();
    } catch {
      Toast.error(t('offerUpdateError'));
    }
  };

  const handleProposeExchange = async (plant: PlantSummary) => {
    setIsPlantPickerOpen(false);
    setIsActing(true);
    try {
      await sendOfferMessage({ recipientId: listing.userId, listingId: listing.id, offeredPlantId: plant.id });
      setHasActedThisSession(true);
      handleOpenChat(listing.userId);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('exchangeProposeError'));
    } finally {
      setIsActing(false);
    }
  };

  const handleMarkCompleted = async () => {
    const confirmed = await confirm(t('markCompletedConfirmTitle'), t('markCompletedConfirmMessage'), {
      confirmLabel: t('markCompletedConfirmLabel'),
    });
    if (!confirmed) return;

    setIsActing(true);
    try {
      await setListingStatus({ id: listing.id, status: LISTING_STATUS.COMPLETED });
      router.back();
    } catch {
      Toast.error(t('listingUpdateError'));
    } finally {
      setIsActing(false);
    }
  };

  const handleMarkExpired = async () => {
    const confirmed = await confirm(t('markExpiredConfirmTitle'), t('markExpiredConfirmMessage'), {
      confirmLabel: t('markExpiredConfirmLabel'),
    });
    if (!confirmed) return;

    setIsActing(true);
    try {
      await setListingStatus({ id: listing.id, status: LISTING_STATUS.EXPIRED });
      Toast.success(t('listingExpiredSuccess'));
    } catch {
      Toast.error(t('listingUpdateError'));
    } finally {
      setIsActing(false);
    }
  };

  const handleReactivate = async () => {
    setIsActing(true);
    try {
      await setListingStatus({ id: listing.id, status: LISTING_STATUS.AVAILABLE });
      Toast.success(t('listingReactivatedSuccess'));
    } catch {
      Toast.error(t('listingUpdateError'));
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm(t('deleteConfirmTitle'), t('deleteConfirmMessage'), {
      confirmLabel: t('deleteConfirmLabel'),
      destructive: true,
    });
    if (!confirmed) return;

    setIsActing(true);
    try {
      await removeListing(listing.id);
      router.back();
    } catch {
      Toast.error(t('listingDeleteError'));
    } finally {
      setIsActing(false);
    }
  };

  const handlePressOwner = () => {
    router.push({ pathname: '/profile/[id]', params: { id: listing.userId } });
  };

  const handleOpenShareModal = () => {
    setShareCaption(`${listingShareVerb(listing.listingType)} "${listing.title}"!`);
    setIsShareModalOpen(true);
  };

  const handleSubmitShare = async () => {
    if (!user) return;
    setIsSharing(true);
    try {
      await createPost(user.id, shareCaption.trim(), [], null, listing.photoUrls, listing.id);
      setIsShareModalOpen(false);
      Toast.success(t('shareSuccess'));
    } catch {
      Toast.error(t('shareError'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenActions = () => {
    Alert.alert(
      t('editListingTitle'),
      undefined,
      buildListingActionButtons(
        listing.status,
        {
          onMarkCompleted: handleMarkCompleted,
          onMarkExpired: handleMarkExpired,
          onReactivate: handleReactivate,
          onShare: handleOpenShareModal,
          onDelete: handleDelete,
        },
        t
      )
    );
  };

  const proposals = buildProposals(
    isExchange,
    interestsQuery.data,
    offersQuery.data,
    handleRespondInterest,
    handleRespondOffer,
    t
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
    >
      <Stack.Screen
        options={
          isOwner
            ? {
                headerRight: () => (
                  <Pressable onPress={handleOpenActions} disabled={isActing} hitSlop={8}>
                    <Pencil size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
                  </Pressable>
                ),
              }
            : undefined
        }
      />

      <ListingPhotoGallery
        photoUrls={listing.photoUrls}
        title={listing.title}
        typeIcon={LISTING_TYPE_ICONS[listing.listingType]}
        typeColor={LISTING_TYPE_COLORS[listing.listingType]}
        typeLabel={listingTypeLabel(listing.listingType)}
        priceLabel={listing.priceCents != null ? formatPrice(listing.priceCents) : null}
      />

      <ScreenContent>
        <Card style={styles.section}>
          <OwnerRow
            eyebrow={t('offeredBy')}
            ownerName={listing.ownerName}
            ownerAvatarUrl={listing.ownerAvatarUrl}
            onPress={handlePressOwner}
          />

          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.locationText}>
              {addressQuery.isLoading ? t('fetchingAddress') : (addressQuery.data ?? t('approximateLocation'))}
            </Text>
          </View>
        </Card>

        <ListingStatusNotice status={listing.status} style={styles.statusNotice} />

        {listing.description ? (
          <Card style={styles.section}>
            <SectionTitle>{t('descriptionSectionTitle')}</SectionTitle>
            <Text style={styles.description}>{listing.description}</Text>
          </Card>
        ) : null}

        <ListingProposalsBlock isOwner={isOwner} isExchange={isExchange} proposals={proposals} onOpenChat={handleOpenChat} />

        <ListingActionFooter
          isOwner={isOwner}
          status={listing.status}
          listingType={listing.listingType}
          hasSentInterest={hasSentInterest}
          isActing={isActing}
          onPropose={() => setIsPlantPickerOpen(true)}
          onInterest={handleInterest}
          onOpenChat={() => handleOpenChat(listing.userId)}
        />
      </ScreenContent>

      <ExchangePlantPickerModal
        visible={isPlantPickerOpen}
        plants={plants}
        onSelect={handleProposeExchange}
        onClose={() => setIsPlantPickerOpen(false)}
      />

      <PromptModal
        visible={isShareModalOpen}
        title={t('shareModalTitle')}
        label={t('shareModalLabel')}
        value={shareCaption}
        onChangeText={setShareCaption}
        submitLabel={t('shareModalSubmit')}
        isSubmitting={isSharing}
        onSubmit={handleSubmitShare}
        onCancel={() => setIsShareModalOpen(false)}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    description: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.foreground,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    locationText: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
    },
    statusNotice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.destructive,
      marginBottom: Metrics.spacing.lg,
    },
  });
