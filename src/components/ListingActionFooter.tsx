import { LISTING_STATUS, LISTING_TYPE, type ListingStatus, type ListingType } from '@/types';
import { SubmitButton } from './SubmitButton';

function interestLabel(listingType: ListingType, hasSentInterest: boolean): string {
  if (hasSentInterest) return 'Interesse enviado';
  return listingType === LISTING_TYPE.SALE ? 'Quero comprar' : 'Tenho interesse';
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
  if (isOwner || status !== LISTING_STATUS.AVAILABLE) return null;

  if (listingType === LISTING_TYPE.EXCHANGE) {
    return (
      <SubmitButton
        label={hasSentInterest ? 'Abrir conversa' : 'Propor troca'}
        onPress={hasSentInterest ? onOpenChat : onPropose}
        loading={isActing}
      />
    );
  }

  return (
    <SubmitButton
      label={interestLabel(listingType, hasSentInterest)}
      onPress={onInterest}
      loading={isActing}
      disabled={hasSentInterest}
    />
  );
}
