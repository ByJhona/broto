import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  getUpcomingEvents,
  patchEventInAllCaches,
  removeEventFromAllCaches,
  type CreateEventInput,
} from '@/services';
import { EVENT_STATUS } from '@/types';
import { useAuth } from './useAuth';

const EVENTS_QUERY_KEY = ['events'] as const;

export function useEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [...EVENTS_QUERY_KEY, user?.id],
    queryFn: () => getUpcomingEvents(user?.id),
    enabled: !!user,
  });

  const { mutateAsync: addEvent } = useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });

  const { mutateAsync: removeEvent } = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: (_data, id) => {
      removeEventFromAllCaches(queryClient, id);
    },
  });

  const { mutateAsync: cancelEventById } = useMutation({
    mutationFn: (id: string) => cancelEvent(id),
    onSuccess: (_data, id) => {
      patchEventInAllCaches(queryClient, id, (event) => ({ ...event, status: EVENT_STATUS.CANCELLED }));
    },
  });

  return {
    events,
    isLoading,
    refresh: refetch,
    addEvent,
    removeEvent,
    cancelEventById,
  };
}
