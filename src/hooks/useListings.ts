import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createListing,
  deleteListing,
  getAvailableListings,
  patchListingInAllCaches,
  removeListingFromAllCaches,
  updateListingStatus,
  type CreateListingInput,
} from '@/services';
import { LISTING_STATUS, type ListingStatus } from '@/types';
import { useAuth } from './useAuth';
import { celebrateXpLevelUp } from './useXp';

const LISTINGS_QUERY_KEY = ['plant-listings'] as const;

export function useListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: listings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: LISTINGS_QUERY_KEY,
    queryFn: getAvailableListings,
    enabled: !!user,
  });

  const { mutateAsync: addListing } = useMutation({
    mutationFn: (input: CreateListingInput) => createListing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
    },
  });

  const { mutateAsync: setListingStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) => updateListingStatus(id, status),
    onSuccess: (_data, { id, status }) => {
      patchListingInAllCaches(queryClient, id, (listing) => ({ ...listing, status }));
      if (status === LISTING_STATUS.COMPLETED && user?.id) celebrateXpLevelUp(queryClient, user.id);
    },
  });

  const { mutateAsync: removeListing } = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: (_data, id) => {
      removeListingFromAllCaches(queryClient, id);
    },
  });

  return {
    listings,
    isLoading,
    refresh: refetch,
    addListing,
    setListingStatus,
    removeListing,
  };
}
