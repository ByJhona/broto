import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Camera from 'lucide-react-native/icons/camera';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { AttachmentPreview } from '../AttachmentPreview';
import { IconButton } from '../IconButton';
import { SendButton } from '../SendButton';

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
          <AttachmentPreview uri={attachedPhotoUri} onRemove={onRemovePhoto} />
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
          <SendButton size={Metrics.size.lg} disabled={!canSend} onPress={onSend} />
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
