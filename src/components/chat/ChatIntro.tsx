import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar } from '../Avatar';

type ChatIntroProps = {
  name: string;
  avatarUrl: string | null | undefined;
  onPressProfile: () => void;
};

export function ChatIntro({ name, avatarUrl, onPressProfile }: Readonly<ChatIntroProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('chat');

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPressProfile}>
        <Avatar name={name} url={avatarUrl} size={Metrics.size.hero} />
      </Pressable>
      <Text style={styles.title}>{t('introTitle', { name })}</Text>
      <Text style={styles.message}>{t('introMessage')}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.xl,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: Metrics.spacing.sm,
    },
    message: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
