import { createClient } from 'jsr:@supabase/supabase-js@2';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MESSAGE_JSON_SCHEMA = {
  name: 'daily_home_message',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description:
          'Frase curta, fofa e engraçada sobre plantas, em português do Brasil, no máximo 8 palavras, pra aparecer como título grande na tela inicial de um app de cuidado de plantas.',
      },
    },
    required: ['message'],
    additionalProperties: false,
  },
};

async function generateMessage(): Promise<string> {
  const content = await callOpenAI({
    messages: [
      {
        role: 'system',
        content:
          'Você escreve frases curtas, fofas e engraçadas sobre plantas pra tela inicial do broto, um app de cuidado de plantas. Sempre em português do Brasil, no máximo 8 palavras, com personalidade e tom acolhedor.',
      },
      { role: 'user', content: 'Escreva a frase de hoje.' },
    ],
    response_format: { type: 'json_schema', json_schema: MESSAGE_JSON_SCHEMA },
  });

  const parsed = JSON.parse(content) as { message: string };
  return parsed.message;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabaseAdmin
    .from('daily_messages')
    .select('*')
    .eq('message_date', today)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify(existing), { headers: { 'Content-Type': 'application/json' } });
  }

  let message: string;
  try {
    message = await generateMessage();
  } catch (error) {
    console.error(error);
    return new Response('Não foi possível gerar a mensagem', { status: 502 });
  }

  await supabaseAdmin
    .from('daily_messages')
    .upsert({ message_date: today, message }, { onConflict: 'message_date', ignoreDuplicates: true });

  const { data: finalRow } = await supabaseAdmin
    .from('daily_messages')
    .select('*')
    .eq('message_date', today)
    .single();

  return new Response(JSON.stringify(finalRow), { headers: { 'Content-Type': 'application/json' } });
});
