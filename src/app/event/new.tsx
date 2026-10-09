import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clock from 'lucide-react-native/icons/clock';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { CardGroup, FloatingScreenControls, InfoSection, PhotoBadge } from '@/components';
import { ComposeFooter, COMPOSE_FOOTER_CLEARANCE } from '@/components/compose/ComposeFooter';
import { ComposeTitleBlock } from '@/components/compose/ComposeTitleBlock';
import { PickerRow } from '@/components/compose/PickerRow';
import { ShareToCommunityGroup } from '@/components/compose/ShareToCommunityGroup';
import { DraftPhotoGallery } from '@/components/DraftPhotoGallery';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime, formatLongDate, formatTime, pickPhoto } from '@/utils';
import { useTranslation } from '@/i18n';
import { useActiveRestriction } from '@/hooks';

const MAX_EVENT_PHOTOS = 1;

type PickerMode = 'date' | 'time';

function defaultEventDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
}

export default function NewEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('event');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState<Date>(defaultEventDate);
  const [iosPickerMode, setIosPickerMode] = useState<PickerMode | null>(null);
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [communityCaption, setCommunityCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const restriction = useActiveRestriction();

  const applyDatePart = (mode: PickerMode, date: Date) => {
    setEventDate((current) => {
      const next = new Date(current);
      if (mode === 'date') {
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      } else {
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  const openPicker = (mode: PickerMode) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDate,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? new Date() : undefined,
        onValueChange: (_event, date) => {
          if (date) applyDatePart(mode, date);
        },
      });
      return;
    }
    setIosPickerMode(mode);
  };

  const handleAddPhoto = async () => {
    const uri = await pickPhoto();
    if (uri) setImageUris([uri]);
  };

  const handleRemovePhoto = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
  };

  const handleContinue = () => {
    if (!title.trim()) {
      setError(t('missingTitleError'));
      return;
    }

    if (eventDate.getTime() <= Date.now()) {
      setError(t('pastDateError'));
      return;
    }

    setError(null);
    router.replace({
      pathname: '/(tabs)',
      params: {
        placingEvent: '1',
        title: title.trim(),
        description: description.trim(),
        eventDate: eventDate.toISOString(),
        photoUrls: JSON.stringify([]),
        photoUris: JSON.stringify(imageUris),
        shareToCommunity: shareToCommunity ? '1' : '0',
        communityCaption: communityCaption.trim(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + COMPOSE_FOOTER_CLEARANCE }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={COMPOSE_FOOTER_CLEARANCE}
      >
        <DraftPhotoGallery
          photoUris={imageUris}
          max={MAX_EVENT_PHOTOS}
          hint={t('photoHint')}
          placeholderIcon={EVENT_ICON}
          placeholderColor={EVENT_COLOR}
          overlay={<PhotoBadge icon={EVENT_ICON} label={formatEventDateTime(eventDate.toISOString())} color={EVENT_COLOR} />}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
        />

        <View style={styles.content}>
          <ComposeTitleBlock
            title={title}
            onChangeTitle={setTitle}
            titleLabel={t('titleLabel')}
            titlePlaceholder={t('titlePlaceholder')}
            description={description}
            onChangeDescription={setDescription}
            descriptionLabel={t('descriptionLabel')}
            descriptionPlaceholder={t('descriptionPlaceholder')}
          />

          <InfoSection title={t('whenLabel')}>
            <CardGroup>
              <PickerRow icon={EVENT_ICON} color={EVENT_COLOR} eyebrow={t('dateLabel')} value={formatLongDate(eventDate)} onPress={() => openPicker('date')} />
              <PickerRow icon={Clock} color={EVENT_COLOR} eyebrow={t('timeLabel')} value={formatTime(eventDate)} onPress={() => openPicker('time')} />
            </CardGroup>

            {Platform.OS === 'ios' && iosPickerMode ? (
              <DateTimePicker
                value={eventDate}
                mode={iosPickerMode}
                display="spinner"
                minimumDate={iosPickerMode === 'date' ? new Date() : undefined}
                onValueChange={(_event, date) => {
                  setIosPickerMode(null);
                  if (date) applyDatePart(iosPickerMode, date);
                }}
                onDismiss={() => setIosPickerMode(null)}
              />
            ) : null}
          </InfoSection>

          <ShareToCommunityGroup
            value={shareToCommunity}
            onValueChange={setShareToCommunity}
            description={t('shareToCommunityDescription')}
            caption={communityCaption}
            onChangeCaption={setCommunityCaption}
            captionLabel={t('communityCommentLabel')}
            captionPlaceholder={t('communityCommentPlaceholder', { title: title || t('untitledEventFallback') })}
          />
        </View>
      </KeyboardAwareScrollView>

      <ComposeFooter label={t('chooseLocationCta')} onPress={handleContinue} error={restriction ?? error} disabled={restriction !== null} />
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
  });
