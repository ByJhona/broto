import { ActivityIndicator } from 'react-native';
import Send from 'lucide-react-native/icons/send';
import { Metrics, useColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton } from './IconButton';

type SendButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
};

export function SendButton({ onPress, disabled = false, loading = false, size = Metrics.size.md }: Readonly<SendButtonProps>) {
  const colors = useColors();
  const { t } = useTranslation('common');
  const isEnabled = !disabled && !loading;
  const color = isEnabled ? colors.primaryForeground : colors.mutedForeground;

  return (
    <IconButton
      accessibilityLabel={t('a11ySend')}
      size={size}
      backgroundColor={isEnabled ? colors.primary : colors.muted}
      disabled={!isEnabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Send size={size > Metrics.size.md ? Metrics.icon.normal : Metrics.icon.small} color={color} strokeWidth={Metrics.icon.stroke.regular} />
      )}
    </IconButton>
  );
}
