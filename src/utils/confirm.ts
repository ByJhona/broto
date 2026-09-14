import { i18n } from '@/i18n';
import { Alert } from './alert';

type ConfirmOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function confirm(title: string, message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const {
    confirmLabel = i18n.t('common:confirm'),
    cancelLabel = i18n.t('common:cancel'),
    destructive = false,
  } = options;

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
