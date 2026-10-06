import { StyleSheet } from 'react-native';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { LISTING_STATUS, LISTING_TYPE, type ListingStatus, type ListingType } from '@/types';
import { Button } from './Button';

type TranslateFn = (key: string) => string;

function interestLabel(listingType: ListingType, hasSentInterest: boolean, t: TranslateFn): string {
  if (hasSentInterest) return t('interestSentLabel');
  return listingType === LISTING_TYPE.SALE ? t('wantToBuyLabel') : t('haveInterestLabel');
}

type ListingActionFooterProps = {
  isOwner: boolean;
  status: ListingStatus;
  listingType: ListingType;
  hasSentInterest: boolean;
  isActing: boolean;
  onPropose: () => void;
  onInterest: () => void;
  onOpenChat: () => void;
};

export function ListingActionFooter({
  isOwner,
  status,
  listingType,
  hasSentInterest,
  isActing,
  onPropose,
  onInterest,
  onOpenChat,
}: Readonly<ListingActionFooterProps>) {
  const { t } = useTranslation('listing');
  if (isOwner || status !== LISTING_STATUS.AVAILABLE) return null;

  if (listingType === LISTING_TYPE.EXCHANGE) {
    return (
      <Button
        label={hasSentInterest ? t('openChatLabel') : t('proposeExchangeLabel')}
        onPress={hasSentInterest ? onOpenChat : onPropose}
        loading={isActing}
        style={styles.button}
      />
    );
  }

  return (
    <Button
      label={interestLabel(listingType, hasSentInterest, t)}
      onPress={onInterest}
      loading={isActing}
      disabled={hasSentInterest}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: Metrics.spacing.sm,
  },
});
