import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { hasEnoughCredits, insufficientCreditsResponse } from '../_shared/credits.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const IDENTIFICATION_CREDIT_COST = 2;
const IDENTIFICATION_CREDIT_REASON = 'identification';

const IDENTIFICATION_JSON_SCHEMA = {
  name: 'plant_identification',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      isPlant: {
        type: 'boolean',
        description:
          'false se a foto não mostra claramente uma planta (ex: pessoa, objeto, chão, animal, ou nada reconhecível). true se dá pra identificar uma planta na imagem.',
      },
      candidates: {
        type: 'array',
        description:
          'Espécies candidatas, da mais pra menos provável. Lista vazia se isPlant for false. Se houver dúvida razoável entre espécies parecidas, liste mais de uma.',
        items: {
          type: 'object',
          properties: {
            scientificName: { type: 'string', description: 'Nome científico (binomial), ex: "Monstera deliciosa".' },
            commonName: { type: ['string', 'null'], description: 'Nome popular em português do Brasil.' },
            family: { type: ['string', 'null'], description: 'Família botânica, ex: "Araceae".' },
            genus: { type: ['string', 'null'], description: 'Gênero botânico, ex: "Monstera".' },
            confidence: {
              type: 'number',
              description: 'Confiança nessa identificação, de 0 a 1.',
            },
          },
          required: ['scientificName', 'commonName', 'family', 'genus', 'confidence'],
          additionalProperties: false,
        },
        minItems: 0,
        maxItems: 5,
      },
    },
    required: ['isPlant', 'candidates'],
    additionalProperties: false,
  },
};

type IdentificationCandidate = {
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  confidence: number;
};

type IdentificationPayload = {
  isPlant: boolean;
  candidates: IdentificationCandidate[];
};

type PlantCandidate = {
  score: number;
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  imageUrl: string | null;
};

async function classifyPhoto(photoUrl: string): Promise<IdentificationPayload> {
  const content = await callOpenAI({
    messages: [
      {
        role: 'system',
        content:
          'Você é um botânico especialista em identificar plantas a partir de fotos. Primeiro avalie se a foto realmente mostra uma planta (folha, flor, caule) — se for uma pessoa, objeto, chão, animal ou qualquer coisa sem planta reconhecível, marque isPlant como false e devolva candidates como uma lista vazia. Se a foto mostrar uma planta, identifique a espécie mais provável pelo nome científico. Se houver dúvida razoável entre espécies parecidas, liste até 5 candidatas, da mais pra menos provável, cada uma com confidence de 0 a 1 refletindo sua certeza real. Nunca invente um nome científico que não existe — se não tiver certeza da espécie exata, prefira indicar o gênero ou família mais prováveis com confidence mais baixo. Nomes populares em português do Brasil.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identifique a planta dessa foto.' },
          { type: 'image_url', image_url: { url: photoUrl } },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: IDENTIFICATION_JSON_SCHEMA },
  });

  return JSON.parse(content) as IdentificationPayload;
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

  if (!(await hasEnoughCredits(supabaseAdmin, user.id, IDENTIFICATION_CREDIT_COST))) {
    return insufficientCreditsResponse();
  }

  let identification: IdentificationPayload;
  try {
    identification = await classifyPhoto(photoUrl);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível identificar a planta', { status: 502 });
  }

  const candidates: PlantCandidate[] = identification.isPlant
    ? identification.candidates.map((candidate) => ({
        score: candidate.confidence,
        scientificName: candidate.scientificName,
        commonName: candidate.commonName,
        family: candidate.family,
        genus: candidate.genus,
        imageUrl: photoUrl,
      }))
    : [];

  if (candidates.length > 0) {
    const { error: consumeError } = await userClient.rpc('consume_credit', {
      credit_reason: IDENTIFICATION_CREDIT_REASON,
    });

    if (consumeError) {
      console.error('Erro descontando crédito da identificação:', consumeError);
      return new Response('Não foi possível descontar o crédito', { status: 500 });
    }
  }

  return new Response(JSON.stringify(candidates), { headers: { 'Content-Type': 'application/json' } });
});
