import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clock from 'lucide-react-native/icons/clock';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card, FormError, FormField, PhotoGrid, ScreenContent, SectionTitle, ShareToCommunityToggle, SubmitButton } from '@/components';
import { Alert, EVENT_COLOR, EVENT_ICON } from '@/utils';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState<Date>(defaultEventDate);
  const [iosPickerMode, setIosPickerMode] = useState<PickerMode | null>(null);
  const [shareToCommunity, setShareToCommunity] = useState(true);
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

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });

    if (result.canceled) return;
    setImageUris([result.assets[0].uri]);
  };

  const handleAddPhoto = () => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Tirar foto', onPress: () => handlePickPhoto('camera') },
      { text: 'Escolher da galeria', onPress: () => handlePickPhoto('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
  };

  const handleContinue = () => {
    if (!title.trim()) {
      setError('Dá um título pro evento.');
      return;
    }

    if (eventDate.getTime() <= Date.now()) {
      setError('Escolha uma data e horário no futuro.');
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
          <SectionTitle>Foto (opcional)</SectionTitle>
          <PhotoGrid photoUrls={imageUris} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} max={MAX_EVENT_PHOTOS} />
        </Card>

        <FormField label="Título" value={title} onChangeText={setTitle} placeholder="Feira de trocas no parque" />

        <FormField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Conte mais sobre o evento e o que os participantes podem esperar"
          multiline
        />

        <View style={styles.field}>
          <Text style={styles.label}>Quando?</Text>
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
          description="Compartilha esse evento também no feed da Comunidade."
        />

        <FormError>{error}</FormError>

        <SubmitButton label="Escolher local no mapa" onPress={handleContinue} />
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
