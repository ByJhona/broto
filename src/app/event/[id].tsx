import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MapPin from 'lucide-react-native/icons/map-pin';
import Pencil from 'lucide-react-native/icons/pencil';
import Users from 'lucide-react-native/icons/users';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  Avatar,
  Card,
  EmptyState,
  EventAttendeesSection,
  ListRow,
  LoadingScreen,
  PlantHero,
  PromptModal,
  ScreenContent,
  SectionTitle,
  SubmitButton,
} from '@/components';
import { useAuth, useEvents } from '@/hooks';
import { cancelAttendance, confirmAttendance, createPost, getEventAttendees, getEventById } from '@/services';
import { Alert, confirm, EVENT_COLOR, EVENT_ICON, formatEventDateTime, Toast, type AlertButton } from '@/utils';

export default function EventDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { removeEvent } = useEvents();
  const [isActing, setIsActing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const EventIcon = EVENT_ICON;

  const eventQuery = useQuery({
    queryKey: ['event', id, user?.id],
    queryFn: () => getEventById(id, user?.id),
    enabled: !!id,
  });

  const event = eventQuery.data;
  const isOwner = !!user && event?.userId === user.id;

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

  const handleDelete = async () => {
    const confirmed = await confirm('Excluir evento', 'Isso remove o evento do mapa. Não dá pra desfazer.', {
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;

    setIsActing(true);
    try {
      await removeEvent(event.id);
      router.back();
    } catch {
      Toast.error('Não foi possível excluir o evento.');
    } finally {
      setIsActing(false);
    }
  };

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
      await createPost(user.id, shareCaption.trim(), null, null, event.photoUrl, null, event.id);
      setIsShareModalOpen(false);
      Toast.success('Evento compartilhado na Comunidade!');
    } catch {
      Toast.error('Não foi possível compartilhar na Comunidade.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenActions = () => {
    const buttons: AlertButton[] = [
      { text: 'Compartilhar na Comunidade', onPress: handleOpenShareModal },
      { text: 'Excluir evento', style: 'destructive', onPress: handleDelete },
      { text: 'Cancelar', style: 'cancel' },
    ];
    Alert.alert('Editar evento', undefined, buttons);
  };

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

      {event.photoUrl ? (
        <PlantHero photoUrl={event.photoUrl} name={event.title} species={formatEventDateTime(event.eventDate)} />
      ) : (
        <>
          <View style={styles.heroPlaceholder}>
            <EventIcon size={Metrics.icon.xl} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
          <View style={styles.plainHeader}>
            <Text style={styles.plainHeaderName}>{event.title}</Text>
            <Text style={styles.plainHeaderDate}>{formatEventDateTime(event.eventDate)}</Text>
          </View>
        </>
      )}

      <ScreenContent>
        <Card style={styles.section}>
          {event.ownerName ? (
            <>
              <ListRow
                leading={<Avatar name={event.ownerName} url={event.ownerAvatarUrl} size={48} />}
                eyebrow="Organizado por"
                title={event.ownerName}
                trailing={<ChevronRight size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
                onPress={handlePressOwner}
              />
              <View style={styles.divider} />
            </>
          ) : null}

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

        {event.description ? (
          <Card style={styles.section}>
            <SectionTitle>Descrição</SectionTitle>
            <Text style={styles.description}>{event.description}</Text>
          </Card>
        ) : null}

        <EventAttendeesSection attendees={attendeesQuery.data} onPressAttendee={handlePressAttendee} />

        {!isOwner ? (
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
      marginTop: Metrics.spacing.sm,
    },
    locationText: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
    },
  });
