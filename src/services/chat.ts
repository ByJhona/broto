import { randomUUID } from 'expo-crypto';
import { updateListingStatus } from './plantListings';
import { supabase } from './supabase';
import type { ChatConversation, ChatMessage, OfferStatus } from '@/types';

const CHAT_MESSAGE_SELECT =
  'id, sender_id, recipient_id, body, message_type, listing_id, offered_plant_id, offer_status, created_at, listing:plant_listings(title), offered_plant:plants(name, photo_urls)';

type ChatMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  message_type: 'text' | 'offer';
  listing_id: string | null;
  offered_plant_id: string | null;
  offer_status: OfferStatus | null;
  created_at: string;
  listing: { title: string } | null;
  offered_plant: { name: string; photo_urls: string[] } | null;
};

function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    messageType: row.message_type,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? null,
    offeredPlantId: row.offered_plant_id,
    offeredPlantName: row.offered_plant?.name ?? null,
    offeredPlantPhotoUrl: row.offered_plant?.photo_urls[0] ?? null,
    offerStatus: row.offer_status,
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
    .insert({ recipient_id: input.recipientId, body: input.body, message_type: 'text' })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) throw error;

  return mapChatMessageRow(data as unknown as ChatMessageRow);
}

export async function sendOfferMessage(input: {
  recipientId: string;
  listingId: string;
  offeredPlantId: string;
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      recipient_id: input.recipientId,
      listing_id: input.listingId,
      offered_plant_id: input.offeredPlantId,
      message_type: 'offer',
      offer_status: 'pending',
    })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) throw error;

  return mapChatMessageRow(data as unknown as ChatMessageRow);
}

export async function respondToOffer(messageId: string, accept: boolean): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .update({ offer_status: accept ? 'accepted' : 'declined' })
    .eq('id', messageId)
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) throw error;

  const message = mapChatMessageRow(data as unknown as ChatMessageRow);

  if (accept && message.listingId) {
    await updateListingStatus(message.listingId, 'completed');
    await supabase
      .from('chat_messages')
      .update({ offer_status: 'declined' })
      .eq('listing_id', message.listingId)
      .eq('message_type', 'offer')
      .eq('offer_status', 'pending');
  }

  return message;
}

export type ListingOfferProposal = {
  id: string;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  offeredPlantName: string | null;
  offeredPlantPhotoUrl: string | null;
  status: OfferStatus;
  createdAt: string;
};

type ListingOfferRow = {
  id: string;
  sender_id: string;
  offer_status: OfferStatus;
  created_at: string;
  sender: { name: string | null; username: string | null; avatar_url: string | null } | null;
  offered_plant: { name: string; photo_urls: string[] } | null;
};

export async function getListingOfferProposals(listingId: string): Promise<ListingOfferProposal[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'id, sender_id, offer_status, created_at, sender:profiles!sender_id(name, username, avatar_url), offered_plant:plants(name, photo_urls)'
    )
    .eq('listing_id', listingId)
    .eq('message_type', 'offer')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as unknown as ListingOfferRow[]).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender?.name || row.sender?.username || null,
    senderAvatarUrl: row.sender?.avatar_url ?? null,
    offeredPlantName: row.offered_plant?.name ?? null,
    offeredPlantPhotoUrl: row.offered_plant?.photo_urls[0] ?? null,
    status: row.offer_status,
    createdAt: row.created_at,
  }));
}

export function subscribeToChatMessages(
  otherUserId: string,
  onChange: (message: ChatMessage) => void
): () => void {
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

type ChatConversationRow = {
  sender_id: string;
  recipient_id: string;
  body: string | null;
  message_type: 'text' | 'offer';
  created_at: string;
  sender: { name: string | null; username: string | null; avatar_url: string | null } | null;
  recipient: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

function conversationPreview(row: ChatConversationRow): string {
  if (row.message_type === 'offer') return 'Propôs uma troca';
  return row.body ?? '';
}

export async function getConversations(userId: string): Promise<ChatConversation[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'sender_id, recipient_id, body, message_type, created_at, sender:profiles!sender_id(name, username, avatar_url), recipient:profiles!recipient_id(name, username, avatar_url)'
    )
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const conversations: ChatConversation[] = [];
  const seen = new Set<string>();

  for (const row of data as unknown as ChatConversationRow[]) {
    const isSender = row.sender_id === userId;
    const otherUserId = isSender ? row.recipient_id : row.sender_id;
    if (seen.has(otherUserId)) continue;
    seen.add(otherUserId);

    const otherProfile = isSender ? row.recipient : row.sender;
    conversations.push({
      otherUserId,
      otherUserName: otherProfile?.name || otherProfile?.username || 'Alguém',
      otherUserAvatarUrl: otherProfile?.avatar_url ?? null,
      lastMessagePreview: conversationPreview(row),
      lastMessageAt: row.created_at,
    });
  }

  return conversations;
}

export function subscribeToOwnMessages(userId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`chat-messages:user:${userId}:${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${userId}` },
      onInsert
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `recipient_id=eq.${userId}` },
      onInsert
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
