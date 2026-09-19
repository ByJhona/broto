import { createClient } from 'jsr:@supabase/supabase-js@2';
import { recordPushTickets, sendExpoPushNotifications } from '../_shared/expoPush.ts';
import { resolveLocale, type Locale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_ACTOR_NAME: Record<Locale, string> = { pt: 'Alguém', en: 'Someone' };

const NOTIFICATION_COPY: Record<Locale, Record<string, (actorName: string) => { title: string; message: string }>> = {
  pt: {
    like: (actorName) => ({ title: 'Nova curtida', message: `${actorName} acabou de curtir a sua foto!` }),
    comment: (actorName) => ({ title: 'Novo recado', message: `${actorName} deixou um recado na sua foto!` }),
    listing_interest: (actorName) => ({
      title: 'Interesse na sua oferta',
      message: `${actorName} se interessou pela planta que você ofereceu!`,
    }),
    listing_message: (actorName) => ({ title: 'Nova mensagem', message: `${actorName} te enviou uma mensagem.` }),
  },
  en: {
    like: (actorName) => ({ title: 'New like', message: `${actorName} just liked your photo!` }),
    comment: (actorName) => ({ title: 'New comment', message: `${actorName} left a comment on your photo!` }),
    listing_interest: (actorName) => ({
      title: 'Interest in your listing',
      message: `${actorName} is interested in the plant you offered!`,
    }),
    listing_message: (actorName) => ({ title: 'New message', message: `${actorName} sent you a message.` }),
  },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!DB_WEBHOOK_SECRET || req.headers.get('Authorization') !== `Bearer ${DB_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { notificationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const notificationId = body.notificationId;
  if (!notificationId) {
    return new Response('Missing notificationId', { status: 400 });
  }

  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .select('user_id, type, title, message, actor:profiles!actor_id(name, username), recipient:profiles!user_id(locale)')
    .eq('id', notificationId)
    .maybeSingle<{
      user_id: string;
      type: string;
      title: string | null;
      message: string | null;
      actor: { name: string | null; username: string | null } | null;
      recipient: { locale: string | null } | null;
    }>();

  if (error || !notification) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const locale = resolveLocale(notification.recipient?.locale);
  const actorName = notification.actor?.name || notification.actor?.username || DEFAULT_ACTOR_NAME[locale];
  const buildCopy = NOTIFICATION_COPY[locale][notification.type];
  const { title, message } = buildCopy ? buildCopy(actorName) : { title: notification.title, message: notification.message };

  if (!title || !message) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const { data: tokenRows } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', notification.user_id);

  const tokens = ((tokenRows ?? []) as { token: string }[]).map((row) => row.token);
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body: message,
    data: { notificationId },
  }));

  const { deliveredTokens, staleTokens, tickets } = await sendExpoPushNotifications(messages);

  if (staleTokens.length > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
  }

  await recordPushTickets(supabaseAdmin, tickets);

  return new Response(JSON.stringify({ sent: deliveredTokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
