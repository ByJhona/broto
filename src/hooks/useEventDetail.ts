import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { i18n, useTranslation } from '@/i18n';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';
import {
  BOOST_DURATION_HOURS,
  boostContent,
  cancelAttendance,
  confirmAttendance,
  createPost,
  CREDIT_COSTS,
  getEventAttendees,
  getEventById,
  InsufficientCreditsError,
} from '@/services';
import { Alert, confirm, Toast } from '@/utils';
import { EVENT_STATUS } from '@/types';

async function reverseGeocodeEventAddress(latitude: number, longitude: number): Promise<string | null> {
  const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (!result) return null;
  return [result.street, result.subregion || result.city, result.region].filter(Boolean).join(', ') || null;
}

async function performEventDelete(
  eventId: string,
  removeEvent: (id: string) => Promise<unknown>,
  setIsActing: (value: boolean) => void,
  onDone: () => void
): Promise<void> {
  const confirmed = await confirm(i18n.t('event:deleteConfirmTitle'), i18n.t('event:deleteConfirmMessage'), {
    confirmLabel: i18n.t('common:delete'),
    destructive: true,
  });
  if (!confirmed) return;

  setIsActing(true);
  try {
    await removeEvent(eventId);
    onDone();
  } catch {
    Toast.error(i18n.t('event:deleteError'));
  } finally {
    setIsActing(false);
  }
}

async function performEventCancel(
  eventId: string,
  cancelEventById: (id: string) => Promise<unknown>,
  setIsActing: (value: boolean) => void
): Promise<void> {
  const confirmed = await confirm(i18n.t('event:cancelConfirmTitle'), i18n.t('event:cancelConfirmMessage'), {
    confirmLabel: i18n.t('event:cancelEventAction'),
    destructive: true,
  });
  if (!confirmed) return;

  setIsActing(true);
  try {
    await cancelEventById(eventId);
    Toast.success(i18n.t('event:cancelSuccess'));
  } catch {
    Toast.error(i18n.t('event:cancelError'));
  } finally {
    setIsActing(false);
  }
}

async function performToggleAttendance(
  eventId: string,
  userId: string,
  isAttending: boolean,
  setIsActing: (value: boolean) => void,
  onDone: () => void
): Promise<void> {
  setIsActing(true);
  try {
    if (isAttending) {
      await cancelAttendance(eventId, userId);
    } else {
      await confirmAttendance(eventId);
    }
    onDone();
  } catch (err) {
    Toast.error(err instanceof Error ? err.message : i18n.t('event:rsvpUpdateError'));
  } finally {
    setIsActing(false);
  }
}

function showInsufficientCreditsAlert(router: ReturnType<typeof useRouter>): void {
  Alert.alert(i18n.t('event:insufficientCreditsTitle'), i18n.t('event:boostCreditsMessage', { cost: CREDIT_COSTS.boost_content }), [
    { text: i18n.t('common:notNow'), style: 'cancel' },
    { text: i18n.t('common:seePlans'), onPress: () => router.push('/profile/plans') },
  ]);
}

async function performEventBoost(
  eventId: string,
  router: ReturnType<typeof useRouter>,
  setIsActing: (value: boolean) => void,
  onDone: () => void
): Promise<void> {
  setIsActing(true);
  try {
    await boostContent('event', eventId);
    onDone();
    Toast.success(i18n.t('event:boostSuccess', { hours: BOOST_DURATION_HOURS }));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      showInsufficientCreditsAlert(router);
    } else {
      Toast.error(i18n.t('event:boostError'));
    }
  } finally {
    setIsActing(false);
  }
}

async function performShareToCommunity(
  userId: string,
  caption: string,
  photoUrl: string | null,
  eventId: string,
  setIsSharing: (value: boolean) => void,
  onDone: () => void
): Promise<void> {
  setIsSharing(true);
  try {
    await createPost(userId, caption.trim(), [], null, photoUrl ? [photoUrl] : [], null, eventId);
    onDone();
    Toast.success(i18n.t('event:shareSuccess'));
  } catch {
    Toast.error(i18n.t('event:shareError'));
  } finally {
    setIsSharing(false);
  }
}

export function useEventDetail(id: string) {
  const router = useRouter();
  const { t } = useTranslation('event');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { removeEvent, cancelEventById } = useEvents();
  const [isActing, setIsActing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['event', id, user?.id],
    queryFn: () => getEventById(id, user?.id),
    enabled: !!id,
  });

  const event = eventQuery.data;
  const isOwner = !!user && event?.userId === user.id;
  // eslint-disable-next-line react-hooks/purity -- reading the wall clock to check if the event date already passed
  const isPast = !!event && new Date(event.eventDate).getTime() < Date.now();
  const isCancelled = event?.status === EVENT_STATUS.CANCELLED;
  const canRsvp = !isOwner && !isCancelled && !isPast;

  const attendeesQuery = useQuery({
    queryKey: ['event-attendees', id],
    queryFn: () => getEventAttendees(id),
    enabled: !!id,
  });

  const addressQuery = useQuery({
    queryKey: ['event-address', event?.latitude, event?.longitude],
    queryFn: () => reverseGeocodeEventAddress(event!.latitude, event!.longitude),
    enabled: !!event,
    staleTime: Infinity,
  });

  const invalidateEvent = () => {
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['event-attendees', id] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleToggleAttendance = () => {
    if (!user || !event) return;
    performToggleAttendance(event.id, user.id, event.isAttending, setIsActing, invalidateEvent);
  };

  const handleDelete = () => {
    if (!event) return;
    performEventDelete(event.id, removeEvent, setIsActing, () => router.back());
  };

  const handleCancelEvent = () => {
    if (!event) return;
    performEventCancel(event.id, cancelEventById, setIsActing);
  };

  const handleBoost = () => {
    if (!event) return;
    performEventBoost(event.id, router, setIsActing, invalidateEvent);
  };

  const handlePressOwner = () => {
    if (!event) return;
    router.push({ pathname: '/profile/[id]', params: { id: event.userId } });
  };

  const handlePressAttendee = (attendeeId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: attendeeId } });
  };

  const handleOpenShareModal = () => {
    if (!event) return;
    setShareCaption(t('communityCommentPlaceholder', { title: event.title }));
    setIsShareModalOpen(true);
  };

  const handleSubmitShare = () => {
    if (!user || !event) return;
    performShareToCommunity(user.id, shareCaption, event.photoUrl, event.id, setIsSharing, () =>
      setIsShareModalOpen(false)
    );
  };

  return {
    event,
    isLoading: eventQuery.isLoading,
    isOwner,
    isPast,
    isCancelled,
    canRsvp,
    isActing,
    attendeesQuery,
    addressQuery,
    isShareModalOpen,
    shareCaption,
    setShareCaption,
    isSharing,
    handleToggleAttendance,
    handleDelete,
    handleCancelEvent,
    handleBoost,
    handlePressOwner,
    handlePressAttendee,
    handleOpenShareModal,
    handleSubmitShare,
    closeShareModal: () => setIsShareModalOpen(false),
  };
}
