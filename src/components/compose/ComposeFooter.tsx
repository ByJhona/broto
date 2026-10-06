import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { BottomBar } from '../BottomBar';
import { Button } from '../Button';
import { FormError } from '../FormError';

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

  return (
    <BottomBar stickToKeyboard>
      <FormError>{error}</FormError>
      <View style={styles.actions}>
        {leading}
        <View style={styles.submit}>
          <Button label={label} onPress={onPress} loading={loading} disabled={disabled} />
        </View>
      </View>
    </BottomBar>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    actions: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.sm,
    },
    submit: {
      flex: 1,
    },
  });
