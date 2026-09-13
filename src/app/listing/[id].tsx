import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import MapPin from 'lucide-react-native/icons/map-pin';
import Pencil from 'lucide-react-native/icons/pencil';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  Avatar,
  Card,
  EmptyState,
  ExchangePlantPickerModal,
  ListingActionFooter,
  ListingPhotoGallery,
  ListingProposalsSection,
  ListRow,
  LoadingScreen,
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
  respondToInterest,
  respondToOffer,
  sendOfferMessage,
  type ListingInterest,
  type ListingOfferProposal,
} from '@/services';
import {
  Alert,
  confirm,
  LISTING_SHARE_VERB,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  LISTING_TYPE_LABELS,
  Toast,
  type AlertButton,
} from '@/utils';
import type { PlantSummary } from '@/types';

function buildProposals(
  isExchange: boolean,
  interests: ListingInterest[] | undefined,
  offers: ListingOfferProposal[] | undefined,
  onRespondInterest: (interestId: string, accept: boolean) => void,
  onRespondOffer: (messageId: string, accept: boolean) => void
): ListingProposal[] {
  if (isExchange) {
    return (offers ?? []).map((offer) => ({
      id: offer.id,
      userId: offer.senderId,
      name: offer.senderName,
      avatarUrl: offer.senderAvatarUrl,
      detail: offer.offeredPlantName ? `Quer trocar por: ${offer.offeredPlantName}` : null,
      status: offer.status,
      onAccept: offer.status === 'pending' ? () => onRespondOffer(offer.id, true) : undefined,
      onDecline: offer.status === 'pending' ? () => onRespondOffer(offer.id, false) : undefined,
    }));
  }

  return (interests ?? []).map((interest) => ({
    id: interest.id,
    userId: interest.userId,
    name: interest.name,
    avatarUrl: interest.avatarUrl,
    detail: interest.message,
    status: interest.status,
    onAccept: interest.status === 'pending' ? () => onRespondInterest(interest.id, true) : undefined,
    onDecline: interest.status === 'pending' ? () => onRespondInterest(interest.id, false) : undefined,
  }));
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setListingStatus, removeListing, sendInterest } = useListings();
  const { plants } = usePlants();
  const [hasSentInterest, setHasSentInterest] = useState(false);
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
  const isExchange = listing?.listingType === 'exchange';

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
    return <EmptyState icon={Leaf} title="Oferta não encontrada" message="Essa oferta pode ter sido removida." />;
  }

  const handleInterest = async () => {
    setIsActing(true);
    try {
      await sendInterest({ listingId: listing.id });
      setHasSentInterest(true);
      Toast.success('Interesse enviado! O dono vai ser avisado.');
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível enviar seu interesse.');
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
      Toast.error('Não foi possível atualizar o interesse.');
    }
  };

  const handleRespondOffer = async (messageId: string, accept: boolean) => {
    try {
      await respondToOffer(messageId, accept);
      invalidateProposals();
    } catch {
      Toast.error('Não foi possível atualizar a proposta.');
    }
  };

  const handleProposeExchange = async (plant: PlantSummary) => {
    setIsPlantPickerOpen(false);
    setIsActing(true);
    try {
      await sendOfferMessage({ recipientId: listing.userId, listingId: listing.id, offeredPlantId: plant.id });
      setHasSentInterest(true);
      handleOpenChat(listing.userId);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível propor a troca.');
    } finally {
      setIsActing(false);
    }
  };

  const handleMarkCompleted = async () => {
    setIsActing(true);
    try {
      await setListingStatus({ id: listing.id, status: 'completed' });
      router.back();
    } catch {
      Toast.error('Não foi possível atualizar a oferta.');
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm('Excluir oferta', 'Isso remove a oferta do mapa. Não dá pra desfazer.', {
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;

    setIsActing(true);
    try {
      await removeListing(listing.id);
      router.back();
    } catch {
      Toast.error('Não foi possível excluir a oferta.');
    } finally {
      setIsActing(false);
    }
  };

  const handlePressOwner = () => {
    router.push({ pathname: '/profile/[id]', params: { id: listing.userId } });
  };

  const handleOpenShareModal = () => {
    setShareCaption(`${LISTING_SHARE_VERB[listing.listingType]} "${listing.title}"!`);
    setIsShareModalOpen(true);
  };

  const handleSubmitShare = async () => {
    if (!user) return;
    setIsSharing(true);
    try {
      await createPost(user.id, shareCaption.trim(), null, null, listing.photoUrls[0] ?? null, listing.id);
      setIsShareModalOpen(false);
      Toast.success('Oferta compartilhada na Comunidade!');
    } catch {
      Toast.error('Não foi possível compartilhar na Comunidade.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenActions = () => {
    const buttons: AlertButton[] = [];
    if (listing.status === 'available') {
      buttons.push({ text: 'Marcar como concluída', onPress: handleMarkCompleted });
    }
    buttons.push({ text: 'Compartilhar na Comunidade', onPress: handleOpenShareModal });
    buttons.push({ text: 'Excluir oferta', style: 'destructive', onPress: handleDelete });
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Editar oferta', undefined, buttons);
  };

  const proposals = buildProposals(
    isExchange,
    interestsQuery.data,
    offersQuery.data,
    handleRespondInterest,
    handleRespondOffer
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
        typeLabel={LISTING_TYPE_LABELS[listing.listingType]}
      />

      <ScreenContent>
        <Card style={styles.section}>
          {listing.ownerName ? (
            <>
              <ListRow
                leading={<Avatar name={listing.ownerName} url={listing.ownerAvatarUrl} size={48} />}
                eyebrow="Oferecido por"
                title={listing.ownerName}
                trailing={<ChevronRight size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
                onPress={handlePressOwner}
              />
              <View style={styles.divider} />
            </>
          ) : null}

          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.locationText}>
              {addressQuery.isLoading ? 'Buscando endereço...' : (addressQuery.data ?? 'Local aproximado no mapa')}
            </Text>
          </View>
        </Card>

        {listing.status !== 'available' ? (
          <Text style={styles.statusNotice}>Essa oferta não está mais disponível.</Text>
        ) : null}

        {listing.description ? (
          <Card style={styles.section}>
            <SectionTitle>Descrição</SectionTitle>
            <Text style={styles.description}>{listing.description}</Text>
          </Card>
        ) : null}

        {isOwner ? (
          <ListingProposalsSection
            title={isExchange ? 'Propostas de troca' : 'Pessoas interessadas'}
            emptyMessage={isExchange ? 'Ninguém propôs uma troca ainda.' : 'Ninguém demonstrou interesse ainda.'}
            proposals={proposals}
            onOpenChat={handleOpenChat}
          />
        ) : null}

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
        title="Compartilhar na Comunidade"
        label="Comentário"
        value={shareCaption}
        onChangeText={setShareCaption}
        submitLabel="Compartilhar"
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
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: Metrics.spacing.md,
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
