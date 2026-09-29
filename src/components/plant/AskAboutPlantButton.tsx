import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { Elevation, Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

export const ASK_BUTTON_CLEARANCE = Metrics.size.hero;

export function AskAboutPlantButton({ plantId }: Readonly<{ plantId: string }>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('plant');

  return (
    <Pressable
      style={({ pressed }) => [styles.button, { bottom: insets.bottom + Metrics.spacing.lg }, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/specialist', params: { plantId } })}
      accessibilityRole="button"
    >
      <MessageCircle size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.label}>{t('askAboutPlantCta')}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: Metrics.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.lg,
      ...Elevation.high,
      shadowColor: colors.black,
    },
    pressed: {
      opacity: 0.9,
    },
    label: {
      ...Typography.heading,
      color: colors.primaryForeground,
    },
  });
