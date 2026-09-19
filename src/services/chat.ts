import { randomUUID } from 'expo-crypto';
import { i18n } from '@/i18n';
import { supabase } from './supabase';
import type { ChatConversation, ChatMessage } from '@/types';

const CHAT_MESSAGE_SELECT = 'id, sender_id, recipient_id, body, created_at';
const CHAT_MESSAGES_PAGE_SIZE = 30;
const CONVERSATIONS_PAGE_SIZE = 20;

type ChatMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function getHiddenBefore(otherUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('chat_reads')
    .select('hidden_before')
    .eq('other_user_id', otherUserId)
    .maybeSingle();

  if (error) throw error;
  return (data as { hidden_before: string | null } | null)?.hidden_before ?? null;
}

export type ChatMessagesPage = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

export async function getChatMessages(otherUserId: string, cursor: string | null = null): Promise<ChatMessagesPage> {
  const hiddenBefore = await getHiddenBefore(otherUserId);

  let query = supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
    .order('created_at', { ascending: false })
    .limit(CHAT_MESSAGES_PAGE_SIZE);

  if (hiddenBefore) {
    query = query.gt('created_at', hiddenBefore);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = data as unknown as ChatMessageRow[];
  const nextCursor = rows.length === CHAT_MESSAGES_PAGE_SIZE ? rows[rows.length - 1].created_at : null;

  return { messages: rows.map(mapChatMessageRow).reverse(), nextCursor };
}

export async function sendChatMessage(input: { recipientId: string; body: string }): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ recipient_id: input.recipientId, body: input.body })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) throw error;

  return mapChatMessageRow(data as unknown as ChatMessageRow);
}

export function subscribeToChatMessages(otherUserId: string, onChange: (message: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`chat-messages:${otherUserId}:${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${otherUserId}` },
      (payload) => onChange(mapChatMessageRow(payload.new as ChatMessageRow))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `recipient_id=eq.${otherUserId}` },
      (payload) => onChange(mapChatMessageRow(payload.new as ChatMessageRow))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToOwnMessages(userId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`chat-messages:user:${userId}:${randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${userId}` }, onInsert)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `recipient_id=eq.${userId}` }, onInsert)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

type ConversationActivityRow = {
  other_user_id: string;
  activity_at: string;
  is_proposal: boolean;
  is_sender: boolean;
  message_body: string | null;
  proposal_type: string | null;
  proposal_status: string | null;
};

type ConversationProfile = { id: string; name: string | null; username: string | null; avatar_url: string | null };

function activityPreview(row: ConversationActivityRow): string {
  if (!row.is_proposal) return row.message_body ?? '';
  if (row.proposal_status === 'accepted') return i18n.t('chat:offerStatusAccepted');
  if (row.proposal_status === 'declined') return i18n.t('chat:offerStatusDeclined');
  return row.proposal_type === 'offer' ? i18n.t('chat:offerPreview') : i18n.t('chat:interestPreview');
}

function activityHasUnread(row: ConversationActivityRow, lastReadAt: string | undefined): boolean {
  if (row.is_sender) return false;
  return !lastReadAt || row.activity_at > lastReadAt;
}

export type ConversationsPage = {
  conversations: ChatConversation[];
  nextCursor: string | null;
};

export async function getConversations(cursor: string | null = null): Promise<ConversationsPage> {
  const { data, error } = await supabase.rpc('get_conversations', { p_cursor: cursor, p_limit: CONVERSATIONS_PAGE_SIZE });
  if (error) throw error;

  const rows = data as ConversationActivityRow[];
  if (rows.length === 0) return { conversations: [], nextCursor: null };

  const otherUserIds = rows.map((row) => row.other_user_id);

  const [{ data: profilesData, error: profilesError }, { data: readsData, error: readsError }] = await Promise.all([
    supabase.from('profiles').select('id, name, username, avatar_url').in('id', otherUserIds),
    supabase.from('chat_reads').select('other_user_id, last_read_at').in('other_user_id', otherUserIds),
  ]);

  if (profilesError) throw profilesError;
  if (readsError) throw readsError;

  const profileById = new Map((profilesData as ConversationProfile[]).map((profile) => [profile.id, profile]));
  const lastReadByOtherUser = new Map(
    (readsData as { other_user_id: string; last_read_at: string }[]).map((row) => [row.other_user_id, row.last_read_at])
  );

  const conversations: ChatConversation[] = rows.map((row) => {
    const profile = profileById.get(row.other_user_id);
    return {
      otherUserId: row.other_user_id,
      otherUserName: profile?.name || profile?.username || i18n.t('common:someone'),
      otherUserAvatarUrl: profile?.avatar_url ?? null,
      lastMessagePreview: activityPreview(row),
      lastMessageAt: row.activity_at,
      hasUnread: activityHasUnread(row, lastReadByOtherUser.get(row.other_user_id)),
    };
  });

  const nextCursor = rows.length === CONVERSATIONS_PAGE_SIZE ? rows[rows.length - 1].activity_at : null;

  return { conversations, nextCursor };
}

export async function hasUnreadConversations(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_unread_conversations');
  if (error) throw error;
  return !!data;
}

export async function markConversationRead(otherUserId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_other_user_id: otherUserId });
  if (error) throw error;
}

export async function hideConversation(otherUserId: string): Promise<void> {
  const { error } = await supabase.rpc('hide_conversation', { p_other_user_id: otherUserId });
  if (error) throw error;
}
