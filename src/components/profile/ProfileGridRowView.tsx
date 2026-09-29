import { StyleSheet, View } from 'react-native';
import { formatDistanceTo } from '@/utils';
import type { usePostActions } from '@/hooks';
import { CommunityPostCard } from '../CommunityPostCard';
import { EventCard } from '../EventCard';
import { GRID_GAP, useGridCardWidth } from '../gridLayout';
import { ListingCard } from '../ListingCard';
import { PROFILE_TAB, type ProfileGridRow } from './profileTabs';

type ProfileGridRowViewProps = {
  row: ProfileGridRow;
  userLocation: { latitude: number; longitude: number } | null;
  currentUserId: string | undefined;
  postActions: ReturnType<typeof usePostActions>;
  onPressListing: (listingId: string) => void;
  onPressEvent: (eventId: string) => void;
};

export function ProfileGridRowView({
  row,
  userLocation,
  currentUserId,
  postActions,
  onPressListing,
  onPressEvent,
}: Readonly<ProfileGridRowViewProps>) {
  const cardWidth = useGridCardWidth();

  if (row.kind === PROFILE_TAB.POSTS) {
    return (
      <CommunityPostCard
        post={row.post}
        currentUserId={currentUserId}
        onToggleLike={postActions.handleToggleLike}
        onDelete={postActions.handleDeletePost}
        onBoost={postActions.handleBoostPost}
        onPressListing={onPressListing}
        onPressEvent={onPressEvent}
      />
    );
  }

  if (row.kind === PROFILE_TAB.LISTINGS) {
    return (
      <View style={[styles.row, styles.cardRow]}>
        {row.listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            distanceLabel={formatDistanceTo(userLocation, listing.latitude, listing.longitude)}
            onPress={() => onPressListing(listing.id)}
            style={{ width: cardWidth }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.cardRow]}>
      {row.events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          distanceLabel={formatDistanceTo(userLocation, event.latitude, event.longitude)}
          onPress={() => onPressEvent(event.id)}
          style={{ width: cardWidth }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cardRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
});
