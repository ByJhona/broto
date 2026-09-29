import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Pencil from 'lucide-react-native/icons/pencil';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton } from '../IconButton';
import { OutlineButton } from '../OutlineButton';
import { SubmitButton } from '../SubmitButton';

type ProfileActionsProps = {
  isOwnProfile: boolean;
  following: boolean;
  onToggleFollow: () => void;
  onPressMessage: () => void;
  onEditProfile: () => void;
};

export function ProfileActions({ isOwnProfile, following, onToggleFollow, onPressMessage, onEditProfile }: Readonly<ProfileActionsProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['profile', 'common']);

  if (isOwnProfile) {
    return <OutlineButton label={t('editProfileTitle')} icon={Pencil} onPress={onEditProfile} />;
  }

  return (
    <View style={styles.row}>
      <View style={styles.primary}>
        {following ? (
          <OutlineButton label={t('following')} icon={Check} onPress={onToggleFollow} />
        ) : (
          <SubmitButton label={t('follow')} onPress={onToggleFollow} />
        )}
      </View>
      <IconButton accessibilityLabel={t('common:a11ySendMessage')} size={Metrics.size.xl} style={styles.message} onPress={onPressMessage}>
        <MessageCircle size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </IconButton>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.sm,
    },
    primary: {
      flex: 1,
    },
    message: {
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
