import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapPin from 'lucide-react-native/icons/map-pin';
import Users from 'lucide-react-native/icons/users';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { Button, EmptyState, EventAttendeesSection, FeaturedBadge, FloatingScreenControls, InfoSection, LoadingScreen, MetaRow, OwnerRow, PageTitle, PhotoBadge, PhotoPager, PromptModal, ScreenContent, StatusNotice } from '@/components';
import { useEventDetail, useModerationActions } from '@/hooks';
import { isBoostActive } from '@/services';
import { ActionSheet, closeAlertButton, EVENT_COLOR, EVENT_ICON, formatEventDateTime, type AlertButton } from '@/utils';
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
  buttons.push(closeAlertButton(t));
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

type Styles = ReturnType<typeof makeStyles>;

type EventHeroProps = {
  event: PlantEvent;
  styles: Styles;
};

function EventHero({ event, styles }: Readonly<EventHeroProps>) {
  const dateLabel = formatEventDateTime(event.eventDate);
  return (
    <>
      <PhotoPager
        photoUrls={event.photoUrl ? [event.photoUrl] : []}
        placeholderIcon={EVENT_ICON}
        placeholderColor={EVENT_COLOR}
        fullWidth
        recyclingKey={event.id}
        overlay={
          <>
            <PhotoBadge icon={EVENT_ICON} label={dateLabel} color={EVENT_COLOR} />
            {isBoostActive(event.boostedUntil) ? <FeaturedBadge /> : null}
          </>
        }
      />
      <View style={styles.titleBlock}>
        <PageTitle>{event.title}</PageTitle>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
    </>
  );
}

type EventFactsProps = {
  event: PlantEvent;
  isAddressLoading: boolean;
  address: string | null | undefined;
  styles: Styles;
};

function EventFacts({ event, isAddressLoading, address, styles }: Readonly<EventFactsProps>) {
  const { t } = useTranslation('event');
  return (
    <View style={styles.facts}>
      <MetaRow icon={MapPin} iconColor={EVENT_COLOR} label={formatAddressText(t, isAddressLoading, address)} numberOfLines={2} />
      <MetaRow icon={Users} iconColor={EVENT_COLOR} label={formatAttendeeCountText(t, event.attendeeCount)} />
    </View>
  );
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useEventDetail(id);
  const moderation = useModerationActions();
  const { t } = useTranslation(['event', 'common']);

  if (detail.isLoading) {
    return (
      <View style={styles.container}>
        <LoadingScreen />
        <FloatingScreenControls />
      </View>
    );
  }

  if (!detail.event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <EmptyState icon={EVENT_ICON} title={t('eventNotFoundTitle')} message={t('eventNotFoundMessage')} />
        <FloatingScreenControls />
      </View>
    );
  }

  const { event } = detail;

  const handleOpenActions = () => {
    const buttons = buildEventActionButtons(t, detail.isCancelled, detail.isPast, {
      onShare: detail.handleOpenShareModal,
      onCancel: detail.handleCancelEvent,
      onBoost: detail.handleBoost,
      onDelete: detail.handleDelete,
    });
    ActionSheet.show(t('editEventActionsTitle'), buttons);
  };

  const handleOpenOtherActions = () =>
    moderation.openUserActions(
      { id: event.userId, name: event.ownerName ?? t('moderation:someone') },
      [moderation.reportButton({ type: 'event', id: event.id }, t('moderation:reportEventAction'))],
      () => router.back()
    );

  const statusNotice = eventStatusNotice(t, detail.isCancelled, detail.isPast);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
        <EventHero event={event} styles={styles} />

        <ScreenContent style={styles.content}>
          <EventFacts
            event={event}
            isAddressLoading={detail.addressQuery.isLoading}
            address={detail.addressQuery.data}
            styles={styles}
          />

          <StatusNotice text={statusNotice?.text ?? null} muted={statusNotice?.muted} />

          <OwnerRow
            eyebrow={t('organizedByEyebrow')}
            ownerName={event.ownerName}
            ownerAvatarUrl={event.ownerAvatarUrl}
            onPress={detail.handlePressOwner}
          />

          {event.description ? (
            <InfoSection title={t('descriptionSectionTitle')}>
              <Text style={styles.description}>{event.description}</Text>
            </InfoSection>
          ) : null}

          <EventAttendeesSection attendees={detail.attendeesQuery.data} onPressAttendee={detail.handlePressAttendee} />

          {detail.canRsvp ? (
            <Button
              label={event.isAttending ? t('cancelAttendance') : t('confirmAttendance')}
              onPress={detail.handleToggleAttendance}
              loading={detail.isActing}
              style={styles.rsvp}
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
      <FloatingScreenControls onOpenActions={detail.isOwner ? handleOpenActions : handleOpenOtherActions} isBusy={detail.isActing} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
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
    date: {
      ...Typography.headingMedium,
      color: EVENT_COLOR,
      marginTop: Metrics.spacing.xs,
    },
    content: {
      paddingTop: Metrics.spacing.sm,
    },
    rsvp: {
      marginTop: Metrics.spacing.sm,
    },
    description: {
      ...Typography.body,
      color: colors.foreground,
    },
    facts: {
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.lg,
    },
  });
