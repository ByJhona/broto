import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
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
import { useEventDetail } from '@/hooks';
import { Alert, EVENT_COLOR, EVENT_ICON, formatEventDateTime, type AlertButton } from '@/utils';
import type { PlantEvent } from '@/types';

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

function formatAddressText(isLoading: boolean, address: string | null | undefined): string {
  if (isLoading) return 'Buscando endereço...';
  return address ?? 'Local aproximado no mapa';
}

function formatAttendeeCountText(count: number): string {
  if (count === 1) return '1 pessoa confirmada';
  return `${count} pessoas confirmadas`;
}

function buildEventHeaderOptions(
  isOwner: boolean,
  isActing: boolean,
  colors: ThemeColors,
  onOpenActions: () => void
) {
  if (!isOwner) return undefined;
  return {
    headerRight: () => (
      <Pressable onPress={onOpenActions} disabled={isActing} hitSlop={8}>
        <Pencil size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
    ),
  };
}

type Styles = ReturnType<typeof makeStyles>;

type EventHeroProps = {
  photoUrl: string | null;
  title: string;
  eventDate: string;
  styles: Styles;
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

type EventMetaCardProps = {
  event: PlantEvent;
  isAddressLoading: boolean;
  address: string | null | undefined;
  onPressOwner: () => void;
  styles: Styles;
};

function EventMetaCard({ event, isAddressLoading, address, onPressOwner, styles }: Readonly<EventMetaCardProps>) {
  return (
    <Card style={styles.section}>
      <OwnerRow
        eyebrow="Organizado por"
        ownerName={event.ownerName}
        ownerAvatarUrl={event.ownerAvatarUrl}
        onPress={onPressOwner}
      />

      <View style={styles.locationRow}>
        <MapPin size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.locationText}>{formatAddressText(isAddressLoading, address)}</Text>
      </View>

      <View style={styles.locationRow}>
        <Users size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.locationText}>{formatAttendeeCountText(event.attendeeCount)}</Text>
      </View>
    </Card>
  );
}

type EventStatusNoticeProps = {
  notice: { text: string; muted: boolean } | null;
  styles: Styles;
};

function EventStatusNotice({ notice, styles }: Readonly<EventStatusNoticeProps>) {
  if (!notice) return null;
  return <Text style={notice.muted ? styles.statusNoticeMuted : styles.statusNotice}>{notice.text}</Text>;
}

type EventDescriptionCardProps = {
  description: string | null;
  styles: Styles;
};

function EventDescriptionCard({ description, styles }: Readonly<EventDescriptionCardProps>) {
  if (!description) return null;
  return (
    <Card style={styles.section}>
      <SectionTitle>Descrição</SectionTitle>
      <Text style={styles.description}>{description}</Text>
    </Card>
  );
}

export default function EventDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useEventDetail(id);

  if (detail.isLoading) {
    return <LoadingScreen />;
  }

  if (!detail.event) {
    return <EmptyState icon={EVENT_ICON} title="Evento não encontrado" message="Esse evento pode ter sido removido." />;
  }

  const { event } = detail;

  const handleOpenActions = () => {
    const buttons = buildEventActionButtons(detail.isCancelled, detail.isPast, {
      onShare: detail.handleOpenShareModal,
      onCancel: detail.handleCancelEvent,
      onDelete: detail.handleDelete,
    });
    Alert.alert('Editar evento', undefined, buttons);
  };

  const statusNotice = eventStatusNotice(detail.isCancelled, detail.isPast);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
      <Stack.Screen options={buildEventHeaderOptions(detail.isOwner, detail.isActing, colors, handleOpenActions)} />

      <EventHero photoUrl={event.photoUrl} title={event.title} eventDate={event.eventDate} styles={styles} />

      <ScreenContent>
        <EventMetaCard
          event={event}
          isAddressLoading={detail.addressQuery.isLoading}
          address={detail.addressQuery.data}
          onPressOwner={detail.handlePressOwner}
          styles={styles}
        />

        <EventStatusNotice notice={statusNotice} styles={styles} />

        <EventDescriptionCard description={event.description} styles={styles} />

        <EventAttendeesSection attendees={detail.attendeesQuery.data} onPressAttendee={detail.handlePressAttendee} />

        {detail.canRsvp ? (
          <SubmitButton
            label={event.isAttending ? 'Cancelar presença' : 'Confirmar presença'}
            onPress={detail.handleToggleAttendance}
            loading={detail.isActing}
          />
        ) : null}
      </ScreenContent>

      <PromptModal
        visible={detail.isShareModalOpen}
        title="Compartilhar na Comunidade"
        label="Comentário"
        value={detail.shareCaption}
        onChangeText={detail.setShareCaption}
        submitLabel="Compartilhar"
        isSubmitting={detail.isSharing}
        onSubmit={detail.handleSubmitShare}
        onCancel={detail.closeShareModal}
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
