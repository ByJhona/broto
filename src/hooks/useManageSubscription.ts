import { useTranslation } from '@/i18n';
import { openSubscriptionManagement } from '@/services';
import { Toast } from '@/utils';

export function useManageSubscription() {
  const { t } = useTranslation('credits');

  return async () => {
    try {
      const opened = await openSubscriptionManagement();
      if (!opened) Toast.info(t('noActiveSubscription'));
    } catch (err) {
      console.error(err);
      Toast.error(t('manageSubscriptionError'));
    }
  };
}
