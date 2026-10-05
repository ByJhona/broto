import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { getProfile } from '@/services';
import { Avatar } from './Avatar';

type CommunityComposerPromptProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function CommunityComposerPrompt({ onPress, style }: Readonly<CommunityComposerPromptProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('community');
  const { user } = useAuth();
  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('createPostAction')}
      style={({ pressed }) => [styles.container, pressed && styles.pressed, style]}
      onPress={onPress}
    >
      <Avatar name={profile?.name ?? ''} url={profile?.avatar_url} size={Metrics.size.md} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {t('composerPlaceholder')}
      </Text>
      <ImagePlus size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.card,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingLeft: Metrics.spacing.sm,
      paddingRight: Metrics.spacing.md,
    },
    pressed: {
      backgroundColor: colors.muted,
    },
    placeholder: {
      ...Typography.body,
      flex: 1,
      color: colors.mutedForeground,
    },
  });
