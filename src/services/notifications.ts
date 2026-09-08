import { supabase } from './supabase';
import type { Notification } from '@/types';

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  type: Notification['type'];
  post_id: string | null;
  created_at: string;
  actor: { name: string | null; username: string | null } | null;
};

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type ?? 'system',
    actorName: row.actor?.name || row.actor?.username || null,
    postId: row.post_id ?? null,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
  };
}

const NOTIFICATION_SELECT = '*, actor:profiles!actor_id(name, username)';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(String(userId))) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data as unknown as NotificationRow[]).map(mapNotificationRow);
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const { data, error } = await supabase.from('notifications').select(NOTIFICATION_SELECT).eq('id', id).single();

  if (error || !data) return null;

  return mapNotificationRow(data as unknown as NotificationRow);
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
  if (error) throw error;
}
