import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPushToUser } from '../_shared/expoPush.ts';
import { resolveLocale, type Locale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_ACTOR_NAME: Record<Locale, string> = { pt: 'Alguém', en: 'Someone' };

type NotificationCopyContext = { actorName: string; plantName: string | null };

const NOTIFICATION_COPY: Record<Locale, Record<string, (ctx: NotificationCopyContext) => { title: string; message: string }>> = {
  pt: {
    like: ({ actorName }) => ({ title: 'Nova curtida', message: `${actorName} acabou de curtir a sua foto!` }),
    comment: ({ actorName }) => ({ title: 'Novo recado', message: `${actorName} deixou um recado na sua foto!` }),
    listing_interest: ({ actorName }) => ({
      title: 'Interesse na sua oferta',
      message: `${actorName} se interessou pela planta que você ofereceu!`,
    }),
    care_setup_reminder: ({ plantName }) => ({
      title: 'Configure um lembrete de cuidado',
      message: plantName
        ? `Sua planta "${plantName}" ainda não tem um lembrete de rega. Que tal configurar um agora?`
        : 'Uma das suas plantas ainda não tem um lembrete de rega. Que tal configurar um agora?',
    }),
  },
  en: {
    like: ({ actorName }) => ({ title: 'New like', message: `${actorName} just liked your photo!` }),
    comment: ({ actorName }) => ({ title: 'New comment', message: `${actorName} left a comment on your photo!` }),
    listing_interest: ({ actorName }) => ({
      title: 'Interest in your listing',
      message: `${actorName} is interested in the plant you offered!`,
    }),
    care_setup_reminder: ({ plantName }) => ({
      title: 'Set up a care reminder',
      message: plantName
        ? `Your plant "${plantName}" doesn't have a watering reminder yet. Want to set one up now?`
        : "One of your plants doesn't have a watering reminder yet. Want to set one up now?",
    }),
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
    .select(
      'user_id, type, title, message, actor:profiles!actor_id(name, username), recipient:profiles!user_id(locale), plant:plants!plant_id(name)'
    )
    .eq('id', notificationId)
    .maybeSingle<{
      user_id: string;
      type: string;
      title: string | null;
      message: string | null;
      actor: { name: string | null; username: string | null } | null;
      recipient: { locale: string | null } | null;
      plant: { name: string | null } | null;
    }>();

  if (error || !notification) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const locale = resolveLocale(notification.recipient?.locale);
  const actorName = notification.actor?.name || notification.actor?.username || DEFAULT_ACTOR_NAME[locale];
  const plantName = notification.plant?.name ?? null;
  const buildCopy = NOTIFICATION_COPY[locale][notification.type];
  const { title, message } = buildCopy
    ? buildCopy({ actorName, plantName })
    : { title: notification.title, message: notification.message };

  if (!title || !message) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const sent = await sendPushToUser(supabaseAdmin, notification.user_id, { title, body: message, data: { notificationId } });

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
