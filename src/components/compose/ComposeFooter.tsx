import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { FormError } from '../FormError';
import { SubmitButton } from '../SubmitButton';

export const COMPOSE_FOOTER_CLEARANCE = Metrics.size.hero + Metrics.spacing.xl;

type ComposeFooterProps = {
  label: string;
  onPress: () => void;
  error?: string | null;
  loading?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
};

export function ComposeFooter({ label, onPress, error = null, loading, disabled, leading }: Readonly<ComposeFooterProps>) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardStickyView style={styles.sticky}>
      <View style={[styles.bar, { paddingBottom: insets.bottom + Metrics.spacing.md }]}>
        <View style={styles.content}>
          <FormError>{error}</FormError>
          <View style={styles.actions}>
            {leading}
            <View style={styles.submit}>
              <SubmitButton label={label} onPress={onPress} loading={loading} disabled={disabled} />
            </View>
          </View>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sticky: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    bar: {
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.sm,
    },
    content: {
      ...Metrics.layout.centeredContent,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.sm,
    },
    submit: {
      flex: 1,
    },
  });
