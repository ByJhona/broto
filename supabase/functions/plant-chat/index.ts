import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { hasEnoughCredits, insufficientCreditsResponse } from '../_shared/credits.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_HISTORY_MESSAGES = 20;
const CHAT_QUESTION_CREDIT_REASON = 'chat_question';

type ChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type PlantContext = {
  name: string;
  species: string | null;
  common_name: string | null;
  watering_days: number | null;
};

type SpeciesContext = {
  description: string;
  care_level: string;
  sun_level: string;
  light_tip: string;
  watering_tip: string;
  humidity_tip: string;
  soil_tip: string;
  fertilizing_tip: string;
  toxic_to_pets: boolean;
  toxic_to_humans: boolean;
};

const SPECIES_CONTEXT_SELECT =
  'description, care_level, sun_level, light_tip, watering_tip, humidity_tip, soil_tip, fertilizing_tip, toxic_to_pets, toxic_to_humans';

function speciesFacts(speciesInfo: SpeciesContext | null): string[] {
  if (!speciesInfo) return [];
  return [
    `Sobre a espécie: ${speciesInfo.description}`,
    `Nível de cuidado: ${speciesInfo.care_level}`,
    `Luz: ${speciesInfo.sun_level}. ${speciesInfo.light_tip}`,
    `Rega: ${speciesInfo.watering_tip}`,
    `Umidade: ${speciesInfo.humidity_tip}`,
    `Substrato: ${speciesInfo.soil_tip}`,
    `Adubação: ${speciesInfo.fertilizing_tip}`,
    `Tóxica para pets: ${speciesInfo.toxic_to_pets ? 'sim' : 'não'}. Tóxica para pessoas: ${speciesInfo.toxic_to_humans ? 'sim' : 'não'}`,
  ];
}

function buildPlantSystemPrompt(plant: PlantContext, speciesInfo: SpeciesContext | null): string {
  const facts = [
    `Nome dado pelo usuário: ${plant.name}`,
    plant.species ? `Espécie: ${plant.species}` : null,
    plant.common_name ? `Nome popular: ${plant.common_name}` : null,
    plant.watering_days ? `O usuário rega a cada ${plant.watering_days} dias` : null,
    ...speciesFacts(speciesInfo),
  ].filter(Boolean);

  return [
    'Você é um especialista em jardinagem doméstica conversando com o dono de uma planta específica, respondendo em português do Brasil.',
    'Use os dados abaixo como contexto sobre essa planta:',
    facts.join('\n'),
    'Responda de forma curta, direta e prática — 2 a 4 frases, sem enrolação. Se a pergunta não tiver relação com a planta ou jardinagem, explique gentilmente que só pode ajudar com isso.',
  ].join('\n\n');
}

function buildGeneralSystemPrompt(): string {
  return [
    'Você é um especialista em jardinagem e cuidado de plantas, respondendo em português do Brasil.',
    'O usuário pode perguntar sobre qualquer planta, mesmo que não tenha cadastrado ela no aplicativo.',
    'Responda de forma curta, direta e prática — 2 a 4 frases, sem enrolação. Se a pergunta não tiver relação com plantas ou jardinagem, explique gentilmente que só pode ajudar com isso.',
  ].join('\n\n');
}

async function askOpenAI(systemPrompt: string, history: ChatMessageRow[], question: string): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: question },
  ];

  return callOpenAI({ messages, max_completion_tokens: 300 });
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

  let body: { plantId?: string; question?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const plantId = body.plantId?.trim() || null;
  const question = body.question?.trim();
  if (!question) {
    return new Response('Missing question', { status: 400 });
  }

  const sessionId = body.sessionId?.trim() || crypto.randomUUID();

  let systemPrompt: string;

  if (plantId) {
    const { data: plant, error: plantError } = await supabaseAdmin
      .from('plants')
      .select('name, species, common_name, watering_days')
      .eq('id', plantId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (plantError || !plant) {
      return new Response('Plant not found', { status: 404 });
    }

    const { data: speciesInfo } = plant.species
      ? await supabaseAdmin
          .from('plant_species_info')
          .select(SPECIES_CONTEXT_SELECT)
          .eq('scientific_name', plant.species)
          .maybeSingle()
      : { data: null };

    systemPrompt = buildPlantSystemPrompt(plant, speciesInfo);
  } else {
    systemPrompt = buildGeneralSystemPrompt();
  }

  if (!(await hasEnoughCredits(supabaseAdmin, user.id, CHAT_QUESTION_CREDIT_REASON))) {
    return insufficientCreditsResponse();
  }

  let historyQuery = supabaseAdmin
    .from('plant_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  historyQuery = plantId ? historyQuery.eq('plant_id', plantId) : historyQuery.is('plant_id', null);

  const { data: history } = await historyQuery;
  const orderedHistory = ((history ?? []) as ChatMessageRow[]).reverse();

  let answer: string;
  try {
    answer = await askOpenAI(systemPrompt, orderedHistory, question);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível responder agora', { status: 502 });
  }

  const { data: newCreditBalance, error: consumeError } = await userClient.rpc('consume_credit', {
    credit_reason: CHAT_QUESTION_CREDIT_REASON,
  });

  if (consumeError) {
    console.error('Erro descontando crédito do chat:', consumeError);
    return new Response('Não foi possível descontar o crédito', { status: 500 });
  }

  const { error: insertError } = await supabaseAdmin
    .from('plant_chat_messages')
    .insert({ plant_id: plantId, user_id: user.id, session_id: sessionId, role: 'user', content: question });

  if (insertError) {
    console.error('Erro salvando pergunta:', insertError);
    return new Response('Não foi possível salvar a pergunta', { status: 500 });
  }

  const { data: assistantMessage, error: assistantInsertError } = await supabaseAdmin
    .from('plant_chat_messages')
    .insert({ plant_id: plantId, user_id: user.id, session_id: sessionId, role: 'assistant', content: answer })
    .select()
    .single();

  if (assistantInsertError || !assistantMessage) {
    console.error('Erro salvando resposta:', assistantInsertError);
    return new Response('Não foi possível salvar a resposta', { status: 500 });
  }

  return new Response(JSON.stringify({ ...assistantMessage, sessionId, newCreditBalance }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
