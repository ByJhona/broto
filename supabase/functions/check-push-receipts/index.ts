import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('PUSH_RECEIPTS_CRON_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_CHUNK_SIZE = 1000;
const MIN_TICKET_AGE_MINUTES = 15;

type PushTicketRow = { ticket_id: string; token: string };
type ExpoReceipt = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

async function fetchReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });

  if (!response.ok) {
    console.error('Erro chamando a Expo Receipts API:', response.status, await response.text());
    return {};
  }

  const result = await response.json();
  return (result.data ?? {}) as Record<string, ExpoReceipt>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cutoff = new Date(Date.now() - MIN_TICKET_AGE_MINUTES * 60 * 1000).toISOString();

  const { data: pendingTickets, error } = await supabaseAdmin
    .from('push_tickets')
    .select('ticket_id, token')
    .lte('created_at', cutoff);

  if (error) {
    console.error('Erro buscando push_tickets pendentes:', error);
    return new Response('Erro buscando tickets', { status: 500 });
  }

  const tickets = (pendingTickets ?? []) as PushTicketRow[];
  if (tickets.length === 0) {
    return new Response(JSON.stringify({ checked: 0, staleTokensRemoved: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const staleTokens = new Set<string>();

  for (let i = 0; i < tickets.length; i += RECEIPT_CHUNK_SIZE) {
    const chunk = tickets.slice(i, i + RECEIPT_CHUNK_SIZE);
    const receipts = await fetchReceipts(chunk.map((ticket) => ticket.ticket_id));

    for (const ticket of chunk) {
      const receipt = receipts[ticket.ticket_id];
      if (receipt?.status !== 'error') continue;

      if (receipt.details?.error === 'DeviceNotRegistered') {
        staleTokens.add(ticket.token);
      } else {
        console.warn('Push receipt com erro:', ticket.ticket_id, receipt.details?.error, receipt.message);
      }
    }
  }

  if (staleTokens.size > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', Array.from(staleTokens));
  }

  await supabaseAdmin
    .from('push_tickets')
    .delete()
    .in('ticket_id', tickets.map((ticket) => ticket.ticket_id));

  return new Response(JSON.stringify({ checked: tickets.length, staleTokensRemoved: staleTokens.size }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
