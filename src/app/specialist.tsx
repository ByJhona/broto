import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton, PlantChat } from '@/components';
import { usePlants } from '@/hooks';

export default function SpecialistScreen() {
  const router = useRouter();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('help');
  const { plants } = usePlants();
  const plant = plantId ? plants.find((item) => item.id === plantId) : undefined;
  const intro = plant ? t('plant:askAboutPlantIntro', { name: plant.name }) : t('specialistIntro');

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.sm }]}>
        <IconButton accessibilityLabel={t('common:a11yBack')} size={Metrics.size.md} onPress={() => router.back()}>
          <ArrowLeft size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
        </IconButton>
        <Text style={styles.title} accessibilityRole="header">
          {t('specialistSectionTitle')}
        </Text>
      </View>
      <View style={[styles.body, { paddingBottom: insets.bottom + Metrics.spacing.md }]}>
        <Text style={styles.intro}>{intro}</Text>
        <PlantChat variant="screen" plantId={plant?.id ?? null} />
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.lg,
      paddingBottom: Metrics.spacing.sm,
    },
    title: {
      flex: 1,
      ...Typography.title,
      color: colors.foreground,
    },
    body: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      paddingHorizontal: Metrics.spacing.lg,
    },
    intro: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.md,
    },
  });
