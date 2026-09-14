import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';
import { cancelAttendance, confirmAttendance, createPost, getEventAttendees, getEventById } from '@/services';
import { confirm, Toast } from '@/utils';
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
  const confirmed = await confirm('Excluir evento', 'Isso remove o evento do mapa. Não dá pra desfazer.', {
    confirmLabel: 'Excluir',
    destructive: true,
  });
  if (!confirmed) return;

  setIsActing(true);
  try {
    await removeEvent(eventId);
    onDone();
  } catch {
    Toast.error('Não foi possível excluir o evento.');
  } finally {
    setIsActing(false);
  }
}

async function performEventCancel(
  eventId: string,
  cancelEventById: (id: string) => Promise<unknown>,
  setIsActing: (value: boolean) => void
): Promise<void> {
  const confirmed = await confirm('Cancelar evento', 'As pessoas confirmadas vão ver que o evento foi cancelado.', {
    confirmLabel: 'Cancelar evento',
    destructive: true,
  });
  if (!confirmed) return;

  setIsActing(true);
  try {
    await cancelEventById(eventId);
    Toast.success('Evento cancelado.');
  } catch {
    Toast.error('Não foi possível cancelar o evento.');
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
    Toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar sua presença.');
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
    Toast.success('Evento compartilhado na Comunidade!');
  } catch {
    Toast.error('Não foi possível compartilhar na Comunidade.');
  } finally {
    setIsSharing(false);
  }
}

export function useEventDetail(id: string) {
  const router = useRouter();
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

  const handlePressOwner = () => {
    if (!event) return;
    router.push({ pathname: '/profile/[id]', params: { id: event.userId } });
  };

  const handlePressAttendee = (attendeeId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: attendeeId } });
  };

  const handleOpenShareModal = () => {
    if (!event) return;
    setShareCaption(`Marquei um evento: "${event.title}"!`);
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
    handlePressOwner,
    handlePressAttendee,
    handleOpenShareModal,
    handleSubmitShare,
    closeShareModal: () => setIsShareModalOpen(false),
  };
}
