import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors } from '@/theme';
import type { CommunityPostEventSummary, CommunityPostListingSummary } from '@/types';
import { EventRow } from '../offers/EventRow';
import { ListingRow } from '../offers/ListingRow';

type PostLinkedPreviewsProps = {
  listing: CommunityPostListingSummary | null;
  event: CommunityPostEventSummary | null;
  onPressListing?: (listingId: string) => void;
  onPressEvent?: (eventId: string) => void;
};

function RowChevron() {
  const colors = useColors();
  return <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />;
}

export function PostLinkedPreviews({ listing, event, onPressListing, onPressEvent }: Readonly<PostLinkedPreviewsProps>) {
  return (
    <>
      {listing ? (
        <ListingRow
          listing={{
            title: listing.title,
            listingType: listing.listingType,
            photoUrls: listing.photoUrl ? [listing.photoUrl] : [],
            boostedUntil: null,
          }}
          trailing={<RowChevron />}
          onPress={() => onPressListing?.(listing.id)}
        />
      ) : null}
      {event ? (
        <EventRow
          event={{ title: event.title, photoUrl: event.photoUrl, eventDate: event.eventDate, boostedUntil: null }}
          trailing={<RowChevron />}
          onPress={() => onPressEvent?.(event.id)}
        />
      ) : null}
    </>
  );
}
