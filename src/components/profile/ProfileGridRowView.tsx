import { StyleSheet, View } from 'react-native';
import { Metrics } from '@/theme';
import { formatDistanceTo } from '@/utils';
import { EventCard } from '../EventCard';
import { GRID_GAP, useColumnWidth, useGridCardWidth } from '../gridLayout';
import { ListingCard } from '../ListingCard';
import { PostGridTile } from './PostGridTile';
import { POST_GRID_COLUMNS, PROFILE_TAB, type ProfileGridRow } from './profileTabs';

const POST_GRID_GAP = Metrics.spacing.xs;

type ProfileGridRowViewProps = {
  row: ProfileGridRow;
  userLocation: { latitude: number; longitude: number } | null;
  onPressPost: (postId: string) => void;
  onPressListing: (listingId: string) => void;
  onPressEvent: (eventId: string) => void;
};

export function ProfileGridRowView({ row, userLocation, onPressPost, onPressListing, onPressEvent }: Readonly<ProfileGridRowViewProps>) {
  const tileSize = useColumnWidth(POST_GRID_COLUMNS, POST_GRID_GAP);
  const cardWidth = useGridCardWidth();

  if (row.kind === PROFILE_TAB.POSTS) {
    return (
      <View style={[styles.row, styles.postRow]}>
        {row.posts.map((post) => (
          <PostGridTile key={post.id} post={post} size={tileSize} onPress={() => onPressPost(post.id)} />
        ))}
      </View>
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
  postRow: {
    gap: POST_GRID_GAP,
    marginBottom: POST_GRID_GAP,
  },
  cardRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
});
