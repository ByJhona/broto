import type { ListingStatus, ListingType } from '@/types';
import { SubmitButton } from './SubmitButton';

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
  if (isOwner || status !== 'available') return null;

  if (listingType === 'exchange') {
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
      label={hasSentInterest ? 'Interesse enviado' : 'Tenho interesse'}
      onPress={onInterest}
      loading={isActing}
      disabled={hasSentInterest}
    />
  );
}
