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
  FeaturedBadge,
  LoadingScreen,
  OwnerRow,
  PlantHero,
  PromptModal,
  ScreenContent,
  SectionTitle,
  SubmitButton,
} from '@/components';
import { useEventDetail } from '@/hooks';
import { isBoostActive } from '@/services';
import { Alert, EVENT_COLOR, EVENT_ICON, formatEventDateTime, type AlertButton } from '@/utils';
import type { PlantEvent } from '@/types';
import { useTranslation } from '@/i18n';

type Translate = (key: string, options?: Record<string, unknown>) => string;

function buildEventActionButtons(
  t: Translate,
  isCancelled: boolean,
  isPast: boolean,
  handlers: { onShare: () => void; onCancel: () => void; onBoost: () => void; onDelete: () => void }
): AlertButton[] {
  const buttons: AlertButton[] = [{ text: t('shareToCommunity'), onPress: handlers.onShare }];
  if (!isCancelled && !isPast) {
    buttons.push({ text: t('boostEventAction'), onPress: handlers.onBoost });
    buttons.push({ text: t('cancelEventAction'), style: 'destructive', onPress: handlers.onCancel });
  }
  buttons.push({ text: t('deleteEventAction'), style: 'destructive', onPress: handlers.onDelete });
  buttons.push({ text: t('common:close'), style: 'cancel' });
  return buttons;
}

function eventStatusNotice(t: Translate, isCancelled: boolean, isPast: boolean): { text: string; muted: boolean } | null {
  if (isCancelled) return { text: t('eventCancelledNotice'), muted: false };
  if (isPast) return { text: t('eventPastNotice'), muted: true };
  return null;
}

function formatAddressText(t: Translate, isLoading: boolean, address: string | null | undefined): string {
  if (isLoading) return t('loadingAddress');
  return address ?? t('approximateLocation');
}

function formatAttendeeCountText(t: Translate, count: number): string {
  return t('attendeesConfirmed', { count });
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
  featured: boolean;
  styles: Styles;
};

function EventHero({ photoUrl, title, eventDate, featured, styles }: Readonly<EventHeroProps>) {
  if (photoUrl) {
    return (
      <PlantHero photoUrl={photoUrl} name={title} species={formatEventDateTime(eventDate)}>
        {featured ? <FeaturedBadge style={styles.featuredBadgeFloating} /> : null}
      </PlantHero>
    );
  }

  return (
    <>
      <View style={styles.heroPlaceholder}>
        <EVENT_ICON size={Metrics.icon.xl} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        {featured ? <FeaturedBadge style={styles.featuredBadgeFloating} /> : null}
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
  const { t } = useTranslation('event');
  return (
    <Card style={styles.section}>
      <OwnerRow
        eyebrow={t('organizedByEyebrow')}
        ownerName={event.ownerName}
        ownerAvatarUrl={event.ownerAvatarUrl}
        onPress={onPressOwner}
      />

      <View style={styles.locationRow}>
        <MapPin size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.locationText}>{formatAddressText(t, isAddressLoading, address)}</Text>
      </View>

      <View style={styles.locationRow}>
        <Users size={16} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.locationText}>{formatAttendeeCountText(t, event.attendeeCount)}</Text>
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
  const { t } = useTranslation('event');
  if (!description) return null;
  return (
    <Card style={styles.section}>
      <SectionTitle>{t('descriptionSectionTitle')}</SectionTitle>
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
  const { t } = useTranslation(['event', 'common']);

  if (detail.isLoading) {
    return <LoadingScreen />;
  }

  if (!detail.event) {
    return <EmptyState icon={EVENT_ICON} title={t('eventNotFoundTitle')} message={t('eventNotFoundMessage')} />;
  }

  const { event } = detail;

  const handleOpenActions = () => {
    const buttons = buildEventActionButtons(t, detail.isCancelled, detail.isPast, {
      onShare: detail.handleOpenShareModal,
      onCancel: detail.handleCancelEvent,
      onBoost: detail.handleBoost,
      onDelete: detail.handleDelete,
    });
    Alert.alert(t('editEventActionsTitle'), undefined, buttons);
  };

  const statusNotice = eventStatusNotice(t, detail.isCancelled, detail.isPast);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
      <Stack.Screen options={buildEventHeaderOptions(detail.isOwner, detail.isActing, colors, handleOpenActions)} />

      <EventHero
        photoUrl={event.photoUrl}
        title={event.title}
        eventDate={event.eventDate}
        featured={isBoostActive(event.boostedUntil)}
        styles={styles}
      />

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
            label={event.isAttending ? t('cancelAttendance') : t('confirmAttendance')}
            onPress={detail.handleToggleAttendance}
            loading={detail.isActing}
          />
        ) : null}
      </ScreenContent>

      <PromptModal
        visible={detail.isShareModalOpen}
        title={t('shareToCommunity')}
        label={t('shareCommentLabel')}
        value={detail.shareCaption}
        onChangeText={detail.setShareCaption}
        submitLabel={t('shareSubmitLabel')}
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
      position: 'relative',
      width: '100%',
      height: 260,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featuredBadgeFloating: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
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
