import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('PUSH_RECEIPTS_CRON_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_CHUNK_SIZE = 100;
const MAX_CHUNKS_PER_RUN = 30;
const MIN_TICKET_AGE_MINUTES = 15;
const RECEIPT_RETENTION_HOURS = 24;

type PushTicketRow = { ticket_id: string; token: string };
type ExpoReceipt = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function fetchReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt> | null> {
  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });

  if (!response.ok) {
    console.error('Erro chamando a Expo Receipts API:', response.status, await response.text());
    return null;
  }

  const result = await response.json();
  return (result.data ?? {}) as Record<string, ExpoReceipt>;
}

async function deleteExpiredTickets(): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_tickets')
    .delete()
    .lt('created_at', minutesAgo(RECEIPT_RETENTION_HOURS * 60));

  if (error) console.error('Erro apagando push_tickets expirados:', error);
}

function staleTokensFrom(tickets: PushTicketRow[], receipts: Record<string, ExpoReceipt>): string[] {
  const staleTokens = new Set<string>();

  for (const ticket of tickets) {
    const receipt = receipts[ticket.ticket_id];
    if (receipt?.status !== 'error') continue;

    if (receipt.details?.error === 'DeviceNotRegistered') {
      staleTokens.add(ticket.token);
    } else {
      console.warn('Push receipt com erro:', ticket.ticket_id, receipt.details?.error, receipt.message);
    }
  }

  return Array.from(staleTokens);
}

async function processChunk(): Promise<{ checked: number; staleTokensRemoved: number } | null> {
  const { data, error } = await supabaseAdmin
    .from('push_tickets')
    .select('ticket_id, token')
    .lte('created_at', minutesAgo(MIN_TICKET_AGE_MINUTES))
    .order('created_at')
    .limit(RECEIPT_CHUNK_SIZE);

  if (error) {
    console.error('Erro buscando push_tickets pendentes:', error);
    return null;
  }

  const tickets = (data ?? []) as PushTicketRow[];
  if (tickets.length === 0) return { checked: 0, staleTokensRemoved: 0 };

  const receipts = await fetchReceipts(tickets.map((ticket) => ticket.ticket_id));
  if (!receipts) return null;

  const staleTokens = staleTokensFrom(tickets, receipts);
  if (staleTokens.length > 0) {
    const { error: tokenError } = await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
    if (tokenError) console.error('Erro apagando push_tokens inválidos:', tokenError);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('push_tickets')
    .delete()
    .in('ticket_id', tickets.map((ticket) => ticket.ticket_id));

  if (deleteError) {
    console.error('Erro apagando push_tickets processados:', deleteError);
    return null;
  }

  return { checked: tickets.length, staleTokensRemoved: staleTokens.length };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteExpiredTickets();

  let checked = 0;
  let staleTokensRemoved = 0;

  for (let chunk = 0; chunk < MAX_CHUNKS_PER_RUN; chunk++) {
    const result = await processChunk();
    if (!result) break;

    checked += result.checked;
    staleTokensRemoved += result.staleTokensRemoved;
    if (result.checked < RECEIPT_CHUNK_SIZE) break;
  }

  return new Response(JSON.stringify({ checked, staleTokensRemoved }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
