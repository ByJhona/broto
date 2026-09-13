import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createListing,
  deleteListing,
  expressInterest,
  getAvailableListings,
  updateListingStatus,
  type CreateListingInput,
} from '@/services';
import type { ListingStatus } from '@/types';
import { useAuth } from './useAuth';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
    },
  });

  const { mutateAsync: removeListing } = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
    },
  });

  const { mutateAsync: sendInterest } = useMutation({
    mutationFn: ({ listingId, message }: { listingId: string; message?: string | null }) =>
      expressInterest(listingId, message),
  });

  return {
    listings,
    isLoading,
    refresh: refetch,
    addListing,
    setListingStatus,
    removeListing,
    sendInterest,
  };
}
