import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import { uniquePhotoFilename } from './storagePath';
import type { PlantEvent } from '@/types';

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  event_date: string;
  latitude: number;
  longitude: number;
  created_at: string;
  owner: { name: string | null; username: string | null; avatar_url: string | null } | null;
  attendees: { count: number }[];
};

const EVENT_SELECT =
  'id, user_id, title, description, photo_url, event_date, latitude, longitude, created_at, owner:profiles!user_id(name, username, avatar_url), attendees:event_attendees(count)';

async function getAttendingEventIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('event_attendees').select('event_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.event_id as string));
}

function mapEventRow(row: EventRow, attendingEventIds: Set<string>): PlantEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    photoUrl: row.photo_url,
    eventDate: row.event_date,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerName: row.owner?.name || row.owner?.username || null,
    ownerAvatarUrl: row.owner?.avatar_url ?? null,
    attendeeCount: row.attendees?.[0]?.count ?? 0,
    isAttending: attendingEventIds.has(row.id),
  };
}

export async function getUpcomingEvents(userId?: string | null): Promise<PlantEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('event_date', new Date().toISOString())
    .is('deleted_at', null)
    .order('event_date', { ascending: true });

  if (error) throw error;

  const attendingIds = userId ? await getAttendingEventIds(userId) : new Set<string>();
  return (data as unknown as EventRow[]).map((row) => mapEventRow(row, attendingIds));
}

export async function getEventsByUserId(organizerId: string, viewerId?: string | null): Promise<PlantEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('user_id', organizerId)
    .is('deleted_at', null)
    .order('event_date', { ascending: false });

  if (error) throw error;

  const attendingIds = viewerId ? await getAttendingEventIds(viewerId) : new Set<string>();
  return (data as unknown as EventRow[]).map((row) => mapEventRow(row, attendingIds));
}

export async function getEventById(id: string, userId?: string | null): Promise<PlantEvent | null> {
  const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).is('deleted_at', null).maybeSingle();

  if (error || !data) return null;

  const attendingIds = userId ? await getAttendingEventIds(userId) : new Set<string>();
  return mapEventRow(data as unknown as EventRow, attendingIds);
}

async function uploadEventPhoto(userId: string, eventId: string, localUri: string): Promise<string> {
  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${userId}/events/${eventId}/${uniquePhotoFilename()}`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export type CreateEventInput = {
  title: string;
  description?: string | null;
  eventDate: string;
  photoUri?: string | null;
  latitude: number;
  longitude: number;
};

export async function createEvent(input: CreateEventInput): Promise<PlantEvent> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error('Usuário não autenticado.');

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: input.title,
      description: input.description ?? null,
      event_date: input.eventDate,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;

  const row = event as unknown as EventRow;

  if (input.photoUri) {
    try {
      const photoUrl = await uploadEventPhoto(user.id, row.id, input.photoUri);
      const { error: photoError } = await supabase.from('events').update({ photo_url: photoUrl }).eq('id', row.id);
      if (photoError) throw photoError;
      row.photo_url = photoUrl;
    } catch (photoErr) {
      await supabase.from('events').delete().eq('id', row.id);
      throw photoErr;
    }
  }

  return mapEventRow(row, new Set());
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function confirmAttendance(eventId: string): Promise<void> {
  const { error } = await supabase.from('event_attendees').insert({ event_id: eventId });
  if (error) throw error;
}

export async function cancelAttendance(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', userId);
  if (error) throw error;
}

export type EventAttendee = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type EventAttendeeRow = {
  user_id: string;
  created_at: string;
  attendee: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const { data, error } = await supabase
    .from('event_attendees')
    .select('user_id, created_at, attendee:profiles!user_id(name, username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as unknown as EventAttendeeRow[]).map((row) => ({
    userId: row.user_id,
    name: row.attendee?.name || row.attendee?.username || null,
    avatarUrl: row.attendee?.avatar_url ?? null,
    createdAt: row.created_at,
  }));
}
