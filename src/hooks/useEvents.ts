import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelAttendance, confirmAttendance, createEvent, deleteEvent, getUpcomingEvents, type CreateEventInput } from '@/services';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });

  const { mutateAsync: rsvpToEvent } = useMutation({
    mutationFn: (eventId: string) => confirmAttendance(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });

  const { mutateAsync: cancelRsvp } = useMutation({
    mutationFn: (eventId: string) => cancelAttendance(eventId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });

  return {
    events,
    isLoading,
    refresh: refetch,
    addEvent,
    removeEvent,
    rsvpToEvent,
    cancelRsvp,
  };
}
