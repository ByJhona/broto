import { randomUUID } from 'expo-crypto';
import { i18n } from '@/i18n';
import { getProposalActivityForUser, type ProposalActivityRow } from './listingProposals';
import { supabase } from './supabase';
import type { ChatConversation, ChatMessage } from '@/types';

const CHAT_MESSAGE_SELECT = 'id, sender_id, recipient_id, body, created_at';

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

export async function getChatMessages(otherUserId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as unknown as ChatMessageRow[]).map(mapChatMessageRow);
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

type ConversationActivity = {
  otherUserId: string;
  otherProfile: { name: string | null; username: string | null; avatar_url: string | null } | null;
  createdAt: string;
  preview: string;
  isSender: boolean;
};

type ChatMessageActivityRow = {
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  sender: { name: string | null; username: string | null; avatar_url: string | null } | null;
  recipient: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

async function getMessageActivity(userId: string): Promise<ConversationActivity[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'sender_id, recipient_id, body, created_at, sender:profiles!sender_id(name, username, avatar_url), recipient:profiles!recipient_id(name, username, avatar_url)'
    )
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as ChatMessageActivityRow[]).map((row) => {
    const isSender = row.sender_id === userId;
    return {
      otherUserId: isSender ? row.recipient_id : row.sender_id,
      otherProfile: isSender ? row.recipient : row.sender,
      createdAt: row.created_at,
      preview: row.body,
      isSender,
    };
  });
}

function proposalPreview(proposalType: ProposalActivityRow['proposal_type']): string {
  return proposalType === 'offer' ? i18n.t('chat:offerPreview') : i18n.t('chat:interestPreview');
}

async function getProposalActivity(userId: string): Promise<ConversationActivity[]> {
  const rows = await getProposalActivityForUser(userId);

  return rows.map((row) => {
    const isSender = row.sender_id === userId;
    return {
      otherUserId: isSender ? row.recipient_id : row.sender_id,
      otherProfile: isSender ? row.recipient : row.sender,
      createdAt: row.created_at,
      preview: proposalPreview(row.proposal_type),
      isSender,
    };
  });
}

function conversationHasUnread(activity: ConversationActivity, lastReadAt: string | undefined): boolean {
  if (activity.isSender) return false;
  return !lastReadAt || activity.createdAt > lastReadAt;
}

export async function getConversations(userId: string): Promise<ChatConversation[]> {
  const [messageActivity, proposalActivity, { data: readsData, error: readsError }] = await Promise.all([
    getMessageActivity(userId),
    getProposalActivity(userId),
    supabase.from('chat_reads').select('other_user_id, last_read_at').eq('user_id', userId),
  ]);

  if (readsError) throw readsError;

  const lastReadByOtherUser = new Map(
    (readsData as { other_user_id: string; last_read_at: string }[]).map((row) => [row.other_user_id, row.last_read_at])
  );

  const combined = [...messageActivity, ...proposalActivity].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const conversations: ChatConversation[] = [];
  const seen = new Set<string>();

  for (const activity of combined) {
    if (seen.has(activity.otherUserId)) continue;
    seen.add(activity.otherUserId);

    conversations.push({
      otherUserId: activity.otherUserId,
      otherUserName: activity.otherProfile?.name || activity.otherProfile?.username || i18n.t('common:someone'),
      otherUserAvatarUrl: activity.otherProfile?.avatar_url ?? null,
      lastMessagePreview: activity.preview,
      lastMessageAt: activity.createdAt,
      hasUnread: conversationHasUnread(activity, lastReadByOtherUser.get(activity.otherUserId)),
    });
  }

  return conversations;
}

export async function markConversationRead(otherUserId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_other_user_id: otherUserId });
  if (error) throw error;
}
