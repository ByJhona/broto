import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapPin from 'lucide-react-native/icons/map-pin';
import Pencil from 'lucide-react-native/icons/pencil';
import Users from 'lucide-react-native/icons/users';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  Card,
  EmptyState,
  EventAttendeesSection,
  LoadingScreen,
  OwnerRow,
  PlantHero,
  PromptModal,
  ScreenContent,
  SectionTitle,
  SubmitButton,
} from '@/components';
import { useAuth, useEvents } from '@/hooks';
import { cancelAttendance, confirmAttendance, createPost, getEventAttendees, getEventById } from '@/services';
import { Alert, confirm, EVENT_COLOR, EVENT_ICON, formatEventDateTime, Toast, type AlertButton } from '@/utils';
import { EVENT_STATUS } from '@/types';

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

function buildEventActionButtons(
  isCancelled: boolean,
  isPast: boolean,
  handlers: { onShare: () => void; onCancel: () => void; onDelete: () => void }
): AlertButton[] {
  const buttons: AlertButton[] = [{ text: 'Compartilhar na Comunidade', onPress: handlers.onShare }];
  if (!isCancelled && !isPast) {
    buttons.push({ text: 'Cancelar evento', style: 'destructive', onPress: handlers.onCancel });
  }
  buttons.push({ text: 'Excluir evento', style: 'destructive', onPress: handlers.onDelete });
  buttons.push({ text: 'Fechar', style: 'cancel' });
  return buttons;
}

function eventStatusNotice(isCancelled: boolean, isPast: boolean): { text: string; muted: boolean } | null {
  if (isCancelled) return { text: 'Esse evento foi cancelado pelo organizador.', muted: false };
  if (isPast) return { text: 'Esse evento já aconteceu.', muted: true };
  return null;
}

type EventHeroProps = {
  photoUrl: string | null;
  title: string;
  eventDate: string;
  styles: ReturnType<typeof makeStyles>;
};

function EventHero({ photoUrl, title, eventDate, styles }: Readonly<EventHeroProps>) {
  if (photoUrl) {
    return <PlantHero photoUrl={photoUrl} name={title} species={formatEventDateTime(eventDate)} />;
  }

  return (
    <>
      <View style={styles.heroPlaceholder}>
        <EVENT_ICON size={Metrics.icon.xl} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
      <View style={styles.plainHeader}>
        <Text style={styles.plainHeaderName}>{title}</Text>
        <Text style={styles.plainHeaderDate}>{formatEventDateTime(eventDate)}</Text>
      </View>
    </>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
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
    queryFn: async () => {
      const [result] = await Location.reverseGeocodeAsync({ latitude: event!.latitude, longitude: event!.longitude });
      if (!result) return null;
      return [result.street, result.subregion || result.city, result.region].filter(Boolean).join(', ') || null;
    },
    enabled: !!event,
    staleTime: Infinity,
  });

  if (eventQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!event) {
    return <EmptyState icon={EVENT_ICON} title="Evento não encontrado" message="Esse evento pode ter sido removido." />;
  }

  const invalidateEvent = () => {
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['event-attendees', id] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleToggleAttendance = async () => {
    if (!user) return;
    setIsActing(true);
    try {
      if (event.isAttending) {
        await cancelAttendance(event.id, user.id);
      } else {
        await confirmAttendance(event.id);
      }
      invalidateEvent();
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar sua presença.');
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = () => performEventDelete(event.id, removeEvent, setIsActing, () => router.back());

  const handleCancelEvent = () => performEventCancel(event.id, cancelEventById, setIsActing);

  const handlePressOwner = () => {
    router.push({ pathname: '/profile/[id]', params: { id: event.userId } });
  };

  const handlePressAttendee = (attendeeId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: attendeeId } });
  };

  const handleOpenShareModal = () => {
    setShareCaption(`Marquei um evento: "${event.title}"!`);
    setIsShareModalOpen(true);
  };

  const handleSubmitShare = async () => {
    if (!user) return;
    setIsSharing(true);
    try {
      await createPost(user.id, shareCaption.trim(), [], null, event.photoUrl ? [event.photoUrl] : [], null, event.id);
      setIsShareModalOpen(false);
      Toast.success('Evento compartilhado na Comunidade!');
    } catch {
      Toast.error('Não foi possível compartilhar na Comunidade.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenActions = () => {
    const buttons = buildEventActionButtons(isCancelled, isPast, {
      onShare: handleOpenShareModal,
      onCancel: handleCancelEvent,
      onDelete: handleDelete,
    });
    Alert.alert('Editar evento', undefined, buttons);
  };

  const statusNotice = eventStatusNotice(isCancelled, isPast);

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

      <EventHero photoUrl={event.photoUrl} title={event.title} eventDate={event.eventDate} styles={styles} />

      <ScreenContent>
        <Card style={styles.section}>
          <OwnerRow
            eyebrow="Organizado por"
            ownerName={event.ownerName}
            ownerAvatarUrl={event.ownerAvatarUrl}
            onPress={handlePressOwner}
          />

          <View style={styles.locationRow}>
            <MapPin size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.locationText}>
              {addressQuery.isLoading ? 'Buscando endereço...' : (addressQuery.data ?? 'Local aproximado no mapa')}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Users size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.locationText}>
              {event.attendeeCount === 1 ? '1 pessoa confirmada' : `${event.attendeeCount} pessoas confirmadas`}
            </Text>
          </View>
        </Card>

        {statusNotice ? (
          <Text style={statusNotice.muted ? styles.statusNoticeMuted : styles.statusNotice}>{statusNotice.text}</Text>
        ) : null}

        {event.description ? (
          <Card style={styles.section}>
            <SectionTitle>Descrição</SectionTitle>
            <Text style={styles.description}>{event.description}</Text>
          </Card>
        ) : null}

        <EventAttendeesSection attendees={attendeesQuery.data} onPressAttendee={handlePressAttendee} />

        {canRsvp ? (
          <SubmitButton
            label={event.isAttending ? 'Cancelar presença' : 'Confirmar presença'}
            onPress={handleToggleAttendance}
            loading={isActing}
          />
        ) : null}
      </ScreenContent>

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
    heroPlaceholder: {
      width: '100%',
      height: 260,
      backgroundColor: colors.muted,
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
      color: colors.foreground,
      textAlign: 'center',
    },
    plainHeaderDate: {
      fontSize: 14,
      fontWeight: '600',
      color: EVENT_COLOR,
      marginTop: 2,
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
      marginTop: Metrics.spacing.sm,
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
    statusNoticeMuted: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.lg,
    },
  });
