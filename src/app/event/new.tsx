import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clock from 'lucide-react-native/icons/clock';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card, FormError, FormField, PhotoGrid, ScreenContent, SectionTitle, ShareToCommunityToggle, SubmitButton } from '@/components';
import { EVENT_COLOR, EVENT_ICON, pickPhoto } from '@/utils';
import { useTranslation } from '@/i18n';

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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const EventIcon = EVENT_ICON;
  const { t } = useTranslation('event');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState<Date>(defaultEventDate);
  const [iosPickerMode, setIosPickerMode] = useState<PickerMode | null>(null);
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [communityCaption, setCommunityCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      <ScreenContent>
        <Card style={styles.section}>
          <SectionTitle>{t('optionalPhotoLabel')}</SectionTitle>
          <PhotoGrid photoUrls={imageUris} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} max={MAX_EVENT_PHOTOS} />
        </Card>

        <FormField label={t('titleLabel')} value={title} onChangeText={setTitle} placeholder={t('titlePlaceholder')} />

        <FormField
          label={t('descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('descriptionPlaceholder')}
          multiline
        />

        <View style={styles.field}>
          <Text style={styles.label}>{t('whenLabel')}</Text>
          <View style={styles.dateTimeRow}>
            <Pressable style={styles.dateTimeButton} onPress={() => openPicker('date')}>
              <EventIcon size={18} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.dateTimeButtonText}>
                {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </Pressable>
            <Pressable style={styles.dateTimeButton} onPress={() => openPicker('time')}>
              <Clock size={18} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.dateTimeButtonText}>
                {`${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`}
              </Text>
            </Pressable>
          </View>

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
        </View>

        <ShareToCommunityToggle
          value={shareToCommunity}
          onValueChange={setShareToCommunity}
          description={t('shareToCommunityDescription')}
        />

        {shareToCommunity ? (
          <FormField
            label={t('communityCommentLabel')}
            value={communityCaption}
            onChangeText={setCommunityCaption}
            placeholder={t('communityCommentPlaceholder', { title: title || t('untitledEventFallback') })}
            multiline
          />
        ) : null}

        <FormError>{error}</FormError>

        <SubmitButton label={t('chooseLocationCta')} onPress={handleContinue} />
      </ScreenContent>
    </KeyboardAwareScrollView>
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
    field: {
      marginBottom: Metrics.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: Metrics.spacing.xs,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    dateTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      backgroundColor: colors.card,
    },
    dateTimeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
  });
