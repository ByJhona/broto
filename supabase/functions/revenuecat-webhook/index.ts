import { createClient } from 'jsr:@supabase/supabase-js@2';
import { syncSubscriberFromRevenueCat } from '../_shared/revenuecat.ts';

type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id: string;
  transaction_id?: string;
};

type WebhookBody = {
  api_version: string;
  event: RevenueCatEvent;
};

const SYNCABLE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'EXPIRATION',
  'CANCELLATION',
  'BILLING_ISSUE',
  'NON_RENEWING_PURCHASE',
]);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const receivedAuth = req.headers.get('Authorization');

  if (!expectedAuth || receivedAuth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = body.event;
  if (!event?.app_user_id || !event.type) {
    return new Response('Missing event fields', { status: 400 });
  }

  if (event.id) {
    const { error: dedupError } = await supabaseAdmin
      .from('revenuecat_processed_events')
      .insert({ event_id: event.id, transaction_id: event.transaction_id ?? null });

    if (dedupError) {
      if (dedupError.code === '23505') {
        return new Response('OK', { status: 200 });
      }
      console.error('Erro registrando evento do RevenueCat:', dedupError);
      return new Response('Internal error', { status: 500 });
    }
  }

  try {
    if (SYNCABLE_EVENTS.has(event.type)) {
      await syncSubscriberFromRevenueCat(supabaseAdmin, event.app_user_id, REVENUECAT_SECRET_API_KEY);
    }
  } catch (error) {
    console.error('Erro processando evento do RevenueCat:', error);
    if (event.id) {
      await supabaseAdmin.from('revenuecat_processed_events').delete().eq('event_id', event.id);
    }
    return new Response('Internal error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
