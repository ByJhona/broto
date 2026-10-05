import { StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Camera from 'lucide-react-native/icons/camera';
import Send from 'lucide-react-native/icons/send';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton } from '../IconButton';
import { RemovePhotoButton } from '../PhotoPagerControls';

type ChatComposerProps = {
  draft: string;
  onChangeDraft: (text: string) => void;
  attachedPhotoUri: string | null;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onSend: () => void;
};

export function ChatComposer({ draft, onChangeDraft, attachedPhotoUri, onPickPhoto, onRemovePhoto, onSend }: Readonly<ChatComposerProps>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['chat', 'common']);
  const canSend = draft.trim().length > 0 || !!attachedPhotoUri;

  return (
    <KeyboardStickyView style={[styles.sticky, { paddingBottom: insets.bottom + Metrics.spacing.sm }]}>
      <View style={styles.content}>
        {attachedPhotoUri ? (
          <View style={styles.attachment}>
            <Image source={{ uri: attachedPhotoUri }} style={styles.attachmentPhoto} contentFit="cover" />
            <View style={styles.attachmentRemove}>
              <RemovePhotoButton onPress={onRemovePhoto} />
            </View>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={onChangeDraft}
              placeholder={t('messagePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={t('messagePlaceholder')}
              multiline
            />
            <IconButton accessibilityLabel={t('common:addPhoto')} size={Metrics.size.md} backgroundColor={colors.card} onPress={onPickPhoto}>
              <Camera size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
            </IconButton>
          </View>
          <IconButton
            accessibilityLabel={t('common:a11ySend')}
            size={Metrics.size.lg}
            backgroundColor={canSend ? colors.primary : colors.muted}
            disabled={!canSend}
            onPress={onSend}
          >
            <Send
              size={Metrics.icon.normal}
              color={canSend ? colors.primaryForeground : colors.mutedForeground}
              strokeWidth={Metrics.icon.stroke.regular}
            />
          </IconButton>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sticky: {
      backgroundColor: colors.background,
      paddingTop: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    content: {
      ...Metrics.layout.centeredContent,
      gap: Metrics.spacing.sm,
    },
    attachment: {
      width: Metrics.size.hero,
      aspectRatio: Metrics.aspect.portrait,
      borderRadius: Metrics.radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.muted,
    },
    attachmentPhoto: {
      width: '100%',
      height: '100%',
    },
    attachmentRemove: {
      position: 'absolute',
      top: Metrics.spacing.xs,
      right: Metrics.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.sm,
    },
    field: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      minHeight: Metrics.size.lg,
      borderRadius: Metrics.radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingLeft: Metrics.spacing.md,
      paddingRight: Metrics.spacing.xs,
      paddingVertical: Metrics.spacing.xs,
    },
    input: {
      flex: 1,
      maxHeight: Metrics.media.sm,
      paddingVertical: Metrics.spacing.sm,
      ...Typography.input,
      color: colors.foreground,
    },
  });
