import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendExpoPushNotifications } from '../_shared/expoPush.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    .select('user_id, type, title, message, actor:profiles!actor_id(name, username)')
    .eq('id', notificationId)
    .maybeSingle<{
      user_id: string;
      type: string;
      title: string | null;
      message: string | null;
      actor: { name: string | null; username: string | null } | null;
    }>();

  if (error || !notification) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const actorName = notification.actor?.name || notification.actor?.username || 'Alguém';
  const { title, message } =
    notification.type === 'like'
      ? { title: 'Nova curtida', message: `${actorName} acabou de curtir a sua foto!` }
      : notification.type === 'comment'
        ? { title: 'Novo recado', message: `${actorName} deixou um recado na sua foto!` }
        : notification.type === 'listing_interest'
          ? { title: 'Interesse na sua oferta', message: `${actorName} se interessou pela planta que você ofereceu!` }
          : notification.type === 'listing_message'
            ? { title: 'Nova mensagem', message: `${actorName} te enviou uma mensagem sobre uma oferta.` }
            : { title: notification.title, message: notification.message };

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

  const { deliveredTokens, staleTokens } = await sendExpoPushNotifications(messages);

  if (staleTokens.length > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
  }

  return new Response(JSON.stringify({ sent: deliveredTokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
