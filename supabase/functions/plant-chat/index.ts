import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { hasEnoughCredits, insufficientCreditsResponse } from '../_shared/credits.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_HISTORY_MESSAGES = 20;
const CHAT_QUESTION_CREDIT_COST = 1;
const CHAT_QUESTION_CREDIT_REASON = 'chat_question';

type ChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function buildSystemPrompt(plant: {
  name: string;
  species: string | null;
  common_name: string | null;
  watering_days: number | null;
  sun_level: string | null;
}, speciesInfo: { description: string; watering_description: string; care_level: string } | null): string {
  const facts = [
    `Nome dado pelo usuário: ${plant.name}`,
    plant.species ? `Espécie: ${plant.species}` : null,
    plant.common_name ? `Nome popular: ${plant.common_name}` : null,
    plant.watering_days ? `Rega a cada ${plant.watering_days} dias` : null,
    plant.sun_level ? `Necessidade de luz: ${plant.sun_level}` : null,
    speciesInfo?.description ? `Sobre a espécie: ${speciesInfo.description}` : null,
    speciesInfo?.watering_description ? `Como regar: ${speciesInfo.watering_description}` : null,
    speciesInfo?.care_level ? `Nível de cuidado: ${speciesInfo.care_level}` : null,
  ].filter(Boolean);

  return [
    'Você é um especialista em jardinagem doméstica conversando com o dono de uma planta específica, respondendo em português do Brasil.',
    'Use os dados abaixo como contexto sobre essa planta:',
    facts.join('\n'),
    'Responda de forma curta, direta e prática — 2 a 4 frases, sem enrolação. Se a pergunta não tiver relação com a planta ou jardinagem, explique gentilmente que só pode ajudar com isso.',
  ].join('\n\n');
}

async function askOpenAI(systemPrompt: string, history: ChatMessageRow[], question: string): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: question },
  ];

  return callOpenAI({ messages, max_tokens: 300 });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { userClient, user } = auth;

  let body: { plantId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const plantId = body.plantId?.trim();
  const question = body.question?.trim();
  if (!plantId || !question) {
    return new Response('Missing plantId or question', { status: 400 });
  }

  const { data: plant, error: plantError } = await supabaseAdmin
    .from('plants')
    .select('name, species, common_name, watering_days, sun_level')
    .eq('id', plantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (plantError || !plant) {
    return new Response('Plant not found', { status: 404 });
  }

  if (!(await hasEnoughCredits(supabaseAdmin, user.id, CHAT_QUESTION_CREDIT_COST))) {
    return insufficientCreditsResponse();
  }

  const { data: speciesInfo } = plant.species
    ? await supabaseAdmin
        .from('plant_species_info')
        .select('description, watering_description, care_level')
        .eq('scientific_name', plant.species)
        .maybeSingle()
    : { data: null };

  const { data: history } = await supabaseAdmin
    .from('plant_chat_messages')
    .select('id, role, content, created_at')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  const orderedHistory = ((history ?? []) as ChatMessageRow[]).reverse();

  let answer: string;
  try {
    answer = await askOpenAI(buildSystemPrompt(plant, speciesInfo), orderedHistory, question);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível responder agora', { status: 502 });
  }

  const { error: insertError } = await supabaseAdmin
    .from('plant_chat_messages')
    .insert({ plant_id: plantId, user_id: user.id, role: 'user', content: question });

  if (insertError) {
    console.error('Erro salvando pergunta:', insertError);
    return new Response('Não foi possível salvar a pergunta', { status: 500 });
  }

  const { data: assistantMessage, error: assistantInsertError } = await supabaseAdmin
    .from('plant_chat_messages')
    .insert({ plant_id: plantId, user_id: user.id, role: 'assistant', content: answer })
    .select()
    .single();

  if (assistantInsertError || !assistantMessage) {
    console.error('Erro salvando resposta:', assistantInsertError);
    return new Response('Não foi possível salvar a resposta', { status: 500 });
  }

  const { error: consumeError } = await userClient.rpc('consume_credit', {
    credit_reason: CHAT_QUESTION_CREDIT_REASON,
  });

  if (consumeError) {
    console.error('Erro descontando crédito do chat:', consumeError);
    return new Response('Não foi possível descontar o crédito', { status: 500 });
  }

  return new Response(JSON.stringify(assistantMessage), { headers: { 'Content-Type': 'application/json' } });
});
