import { ensureWriteApplied } from './writeGuard';
import { supabase } from './supabase';
import { NOTIFICATION_TYPES, type Notification } from '@/types';

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  type: Notification['type'];
  post_id: string | null;
  listing_id: string | null;
  plant_id: string | null;
  actor_id: string | null;
  created_at: string;
  actor: { name: string | null; username: string | null; avatar_url: string | null } | null;
  plant: { name: string | null; photo_urls: string[] } | null;
  post: { image_urls: string[] } | null;
  listing: { photo_urls: string[] } | null;
};

function previewPhotoUrl(row: NotificationRow): string | null {
  return row.post?.image_urls[0] ?? row.listing?.photo_urls[0] ?? row.plant?.photo_urls[0] ?? null;
}

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type ?? 'system',
    actorId: row.actor_id,
    actorName: row.actor?.name || row.actor?.username || null,
    actorAvatarUrl: row.actor?.avatar_url ?? null,
    postId: row.post_id ?? null,
    listingId: row.listing_id ?? null,
    plantId: row.plant_id ?? null,
    plantName: row.plant?.name ?? null,
    previewPhotoUrl: previewPhotoUrl(row),
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function isNotificationType(type: string): boolean {
  return NOTIFICATION_TYPES.some((notificationType) => notificationType === type);
}

const NOTIFICATION_SELECT =
  '*, actor:profiles!actor_id(name, username, avatar_url), plant:plants!plant_id(name, photo_urls), post:posts!post_id(image_urls), listing:plant_listings!listing_id(photo_urls)';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(String(userId))) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('type', NOTIFICATION_TYPES)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data as unknown as NotificationRow[]).map(mapNotificationRow);
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;

  return mapNotificationRow(data as unknown as NotificationRow);
}

export async function deleteNotification(id: string): Promise<void> {
  ensureWriteApplied(
    await supabase.from('notifications').update({ deleted_at: new Date().toISOString() }, { count: 'exact' }).eq('id', id)
  );
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
