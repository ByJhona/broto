import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { hasEnoughCredits, insufficientCreditsResponse } from '../_shared/credits.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GROWTH_CHECK_CREDIT_COST = 2;
const GROWTH_CHECK_CREDIT_REASON = 'growth_check';

const OBSERVATIONS_JSON_SCHEMA = {
  name: 'plant_growth_observations',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      observations: {
        type: 'array',
        description:
          'Dicas de cuidado específicas baseadas no que aparece na foto (ex: folhas amarelando, sinais de sede, crescimento saudável, pragas visíveis). Em português, cada item uma frase curta e prática.',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
      },
    },
    required: ['observations'],
    additionalProperties: false,
  },
};

async function analyzePhoto(photoUrl: string, plantName: string, species: string | null): Promise<string[]> {
  const content = await callOpenAI({
    messages: [
      {
        role: 'system',
        content:
          'Você é um especialista em jardinagem doméstica analisando a foto de uma planta de um usuário. Responda sempre em português do Brasil, com observações práticas e específicas do que consegue ver na imagem (cor das folhas, aspecto geral, sinais de estresse, pragas, crescimento). Não invente informação que não dá pra ver na foto.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Planta: ${plantName}${species ? ` (${species})` : ''}. Analise a foto e dê dicas de cuidado específicas sobre o que você observa.`,
          },
          { type: 'image_url', image_url: { url: photoUrl } },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: OBSERVATIONS_JSON_SCHEMA },
  });

  const parsed = JSON.parse(content) as { observations: string[] };
  return parsed.observations;
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

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription || subscription.plan_id !== 'premium') {
    return new Response('Recurso exclusivo do plano Premium', { status: 403 });
  }

  let body: { plantId?: string; photoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const plantId = body.plantId?.trim();
  const photoUrl = body.photoUrl?.trim();
  if (!plantId || !photoUrl) {
    return new Response('Missing plantId or photoUrl', { status: 400 });
  }

  const { data: plant, error: plantError } = await supabaseAdmin
    .from('plants')
    .select('name, species')
    .eq('id', plantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (plantError || !plant) {
    return new Response('Plant not found', { status: 404 });
  }

  if (!(await hasEnoughCredits(supabaseAdmin, user.id, GROWTH_CHECK_CREDIT_COST))) {
    return insufficientCreditsResponse();
  }

  let observations: string[];
  try {
    observations = await analyzePhoto(photoUrl, plant.name, plant.species);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível analisar a foto', { status: 502 });
  }

  const { data: newCreditBalance, error: consumeError } = await userClient.rpc('consume_credit', {
    credit_reason: GROWTH_CHECK_CREDIT_REASON,
  });

  if (consumeError) {
    console.error('Erro descontando crédito da análise de evolução:', consumeError);
    return new Response('Não foi possível descontar o crédito', { status: 500 });
  }

  const { data: checkin, error: insertError } = await supabaseAdmin
    .from('plant_growth_checkins')
    .insert({ plant_id: plantId, user_id: user.id, photo_url: photoUrl, observations })
    .select()
    .single();

  if (insertError) {
    console.error('Erro salvando plant_growth_checkins:', insertError);
    return new Response('Não foi possível salvar a análise', { status: 500 });
  }

  return new Response(JSON.stringify({ ...checkin, newCreditBalance }), { headers: { 'Content-Type': 'application/json' } });
});
