import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { hasEnoughCredits, insufficientCreditsResponse } from '../_shared/credits.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DIAGNOSIS_CREDIT_COST = 4;
const DIAGNOSIS_CREDIT_REASON = 'diagnosis';

const DIAGNOSIS_JSON_SCHEMA = {
  name: 'plant_diagnosis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      isPlant: {
        type: 'boolean',
        description:
          'false se a foto não mostra claramente uma planta (ex: pessoa, objeto, chão, animal, ou nada reconhecível). true se dá pra analisar uma planta na imagem.',
      },
      healthStatus: {
        type: 'string',
        enum: ['healthy', 'attention', 'urgent'],
        description:
          '"healthy" se a planta parece saudável, "attention" se tem problema(s) leve(s)/moderado(s) pra cuidar em casa, "urgent" se o problema é sério e precisa de ação rápida.',
      },
      summary: {
        type: 'string',
        description:
          'Resumo do estado geral da planta em 2 a 3 frases, tom acolhedor e simples, em português do Brasil, pensando em alguém cuidando de plantas pela primeira vez.',
      },
      issues: {
        type: 'array',
        description: 'Problemas visíveis na foto. Lista vazia se a planta parecer saudável.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Nome curto do problema, ex: "Folhas amarelando".' },
            description: {
              type: 'string',
              description: 'O que foi observado e a causa provável, em 1 a 2 frases simples.',
            },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['title', 'description', 'severity'],
          additionalProperties: false,
        },
        maxItems: 4,
      },
      recommendedActions: {
        type: 'array',
        description:
          '2 a 5 passos práticos e específicos que a pessoa pode fazer agora pra cuidar da planta, frases curtas em português.',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 5,
      },
    },
    required: ['isPlant', 'healthStatus', 'summary', 'issues', 'recommendedActions'],
    additionalProperties: false,
  },
};

type DiagnosisPayload = {
  isPlant: boolean;
  healthStatus: 'healthy' | 'attention' | 'urgent';
  summary: string;
  issues: { title: string; description: string; severity: 'low' | 'medium' | 'high' }[];
  recommendedActions: string[];
};

async function diagnosePhoto(photoUrl: string): Promise<DiagnosisPayload> {
  const content = await callOpenAI({
    messages: [
      {
        role: 'system',
        content:
          'Você é um agrônomo experiente e acolhedor, especializado em ajudar pessoas a cuidarem de plantas domésticas pela primeira vez. Primeiro avalie se a foto realmente mostra uma planta — se for uma pessoa, objeto, chão, animal ou qualquer coisa sem planta reconhecível, marque isPlant como false e preencha os outros campos com valores mínimos (eles serão ignorados). Se a foto mostrar uma planta, marque isPlant como true e analise com atenção (cor e aspecto das folhas, sinais de sede ou excesso de água, pragas, crescimento), respondendo sempre em português do Brasil, sem jargão técnico. Se a planta parecer saudável, comemore isso com a pessoa. Se tiver problema, explique de forma simples e prática, sem alarmismo. Nunca invente o que não dá pra ver na foto — se a imagem não deixar claro, diga isso no resumo.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analise a saúde dessa planta e me dê um diagnóstico completo, pensando em alguém que está cuidando de plantas pela primeira vez.',
          },
          { type: 'image_url', image_url: { url: photoUrl } },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: DIAGNOSIS_JSON_SCHEMA },
  });

  return JSON.parse(content) as DiagnosisPayload;
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

  let body: { photoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const photoUrl = body.photoUrl?.trim();
  if (!photoUrl) {
    return new Response('Missing photoUrl', { status: 400 });
  }

  if (!(await hasEnoughCredits(supabaseAdmin, user.id, DIAGNOSIS_CREDIT_COST))) {
    return insufficientCreditsResponse();
  }

  let diagnosis: DiagnosisPayload;
  try {
    diagnosis = await diagnosePhoto(photoUrl);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível analisar a foto', { status: 502 });
  }

  if (!diagnosis.isPlant) {
    return new Response(JSON.stringify({ isPlant: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: row, error: insertError } = await supabaseAdmin
    .from('plant_diagnoses')
    .insert({
      user_id: user.id,
      photo_url: photoUrl,
      health_status: diagnosis.healthStatus,
      summary: diagnosis.summary,
      issues: diagnosis.issues,
      recommended_actions: diagnosis.recommendedActions,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Erro salvando plant_diagnoses:', insertError);
    return new Response('Não foi possível salvar o diagnóstico', { status: 500 });
  }

  const { error: consumeError } = await userClient.rpc('consume_credit', {
    credit_reason: DIAGNOSIS_CREDIT_REASON,
  });

  if (consumeError) {
    console.error('Erro descontando crédito do diagnóstico:', consumeError);
    return new Response('Não foi possível descontar o crédito', { status: 500 });
  }

  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
});
