import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type ExpoPushMessage = {
  id: string;
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
  richContent?: { image: string };
};

type ExpoPushTicket = { status: string; id?: string; details?: { error?: string } };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

export type SendExpoPushResult = {
  deliveredIds: string[];
  staleTokens: string[];
  tickets: { token: string; ticketId: string }[];
};

export async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<SendExpoPushResult> {
  const deliveredIds: string[] = [];
  const staleTokens: string[] = [];
  const tickets: { token: string; ticketId: string }[] = [];

  for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk.map(({ id: _id, ...message }) => message)),
    });

    if (!response.ok) {
      console.error('Erro chamando a Expo Push API:', response.status, await response.text());
      continue;
    }

    const result = await response.json();
    const chunkTickets = (result.data ?? []) as ExpoPushTicket[];

    chunk.forEach((message, index) => {
      const ticket = chunkTickets[index];
      if (ticket?.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          staleTokens.push(message.to);
        }
        return;
      }
      deliveredIds.push(message.id);
      if (ticket?.id) tickets.push({ token: message.to, ticketId: ticket.id });
    });
  }

  return { deliveredIds, staleTokens, tickets };
}

export async function recordPushTickets(
  supabaseAdmin: SupabaseClient,
  tickets: { token: string; ticketId: string }[]
): Promise<void> {
  if (tickets.length === 0) return;

  const { error } = await supabaseAdmin
    .from('push_tickets')
    .insert(tickets.map((ticket) => ({ ticket_id: ticket.ticketId, token: ticket.token })));

  if (error) console.error('Erro registrando push tickets para checagem de recibo:', error);
}

export type PushContent = {
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export async function sendPushToUser(supabaseAdmin: SupabaseClient, userId: string, content: PushContent): Promise<number> {
  const { data: tokenRows } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);

  const tokens = ((tokenRows ?? []) as { token: string }[]).map((row) => row.token);
  if (tokens.length === 0) return 0;

  const messages = tokens.map((token) => ({ id: token, to: token, ...content }));
  const { deliveredIds, staleTokens, tickets } = await sendExpoPushNotifications(messages);

  if (staleTokens.length > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
  }

  await recordPushTickets(supabaseAdmin, tickets);

  return deliveredIds.length;
}
