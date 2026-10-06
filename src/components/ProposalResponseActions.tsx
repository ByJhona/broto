import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { Button } from './Button';

type ProposalResponseActionsProps = {
  onAccept?: () => void;
  onDecline?: () => void;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProposalResponseActions({ onAccept, onDecline, loading = false, compact = false, style }: Readonly<ProposalResponseActionsProps>) {
  const { t } = useTranslation('listing');

  return (
    <View style={[styles.row, style]}>
      <Button
        label={t('declineAction')}
        variant="destructive"
        compact={compact}
        disabled={loading}
        onPress={() => onDecline?.()}
        style={styles.button}
      />
      <Button label={t('acceptAction')} compact={compact} loading={loading} onPress={() => onAccept?.()} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Metrics.spacing.sm,
  },
  button: {
    flex: 1,
  },
});
