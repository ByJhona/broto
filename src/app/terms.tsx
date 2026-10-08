import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingScreenControls, LegalDocument, useScreenTopInset } from '@/components';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('moderation');

  return (
    <View style={styles.container}>
      <LegalDocument namespace="terms" title={t('termsGateTitle')} topInset={topInset} bottomInset={insets.bottom + Metrics.spacing.xl} />
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
  });
