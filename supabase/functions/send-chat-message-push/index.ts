import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPushToUser } from '../_shared/expoPush.ts';
import { resolveLocale, type Locale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET');

const PREVIEW_MAX_LENGTH = 140;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const COPY: Record<Locale, { defaultSender: string; photo: string }> = {
  pt: { defaultSender: 'Alguém', photo: 'Enviou uma foto' },
  en: { defaultSender: 'Someone', photo: 'Sent a photo' },
};

type ChatMessageRow = {
  sender_id: string;
  recipient_id: string;
  body: string | null;
  photo_url: string | null;
  sender: { name: string | null; username: string | null } | null;
  recipient: { locale: string | null } | null;
};

function jsonResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

function messagePreview(message: ChatMessageRow, locale: Locale): string | null {
  const body = message.body?.trim();
  if (body) return body.length > PREVIEW_MAX_LENGTH ? `${body.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : body;
  return message.photo_url ? COPY[locale].photo : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!DB_WEBHOOK_SECRET || req.headers.get('Authorization') !== `Bearer ${DB_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { messageId?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.messageId) {
    return new Response('Missing messageId', { status: 400 });
  }

  const { data: message, error } = await supabaseAdmin
    .from('chat_messages')
    .select('sender_id, recipient_id, body, photo_url, sender:profiles!sender_id(name, username), recipient:profiles!recipient_id(locale)')
    .eq('id', payload.messageId)
    .maybeSingle<ChatMessageRow>();

  if (error || !message) {
    return jsonResponse({ sent: 0 });
  }

  const locale = resolveLocale(message.recipient?.locale);
  const preview = messagePreview(message, locale);
  if (!preview) {
    return jsonResponse({ sent: 0 });
  }

  const title = message.sender?.name || message.sender?.username || COPY[locale].defaultSender;
  const sent = await sendPushToUser(supabaseAdmin, message.recipient_id, {
    title,
    body: preview,
    data: { chatUserId: message.sender_id },
  });

  return jsonResponse({ sent });
});
