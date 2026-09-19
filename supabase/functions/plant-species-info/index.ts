import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PLANT_INFO_JSON_SCHEMA = {
  name: 'plant_species_info',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Descrição curta da espécie, em português, 2-3 frases.' },
      wateringDescription: { type: 'string', description: 'Dica prática de como regar essa planta, em português.' },
      wateringDaysMin: { type: 'integer' },
      wateringDaysMax: { type: 'integer' },
      sunLevel: {
        type: 'string',
        enum: ['shade', 'partial_shade', 'medium', 'bright_indirect', 'full_sun'],
      },
      careLevel: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
      toxicToPets: { type: 'boolean' },
      toxicToPetsNotes: { type: ['string', 'null'] },
      toxicToHumans: { type: 'boolean' },
      toxicToHumansNotes: { type: ['string', 'null'] },
      funFacts: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
      },
      commonProblems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issue: { type: 'string' },
            likelyCause: { type: 'string' },
          },
          required: ['issue', 'likelyCause'],
          additionalProperties: false,
        },
        minItems: 2,
        maxItems: 4,
      },
      origin: { type: ['string', 'null'] },
      commonNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Nomes populares da planta em português do Brasil, do mais usado ao menos usado.',
        minItems: 1,
        maxItems: 4,
      },
    },
    required: [
      'description',
      'wateringDescription',
      'wateringDaysMin',
      'wateringDaysMax',
      'sunLevel',
      'careLevel',
      'toxicToPets',
      'toxicToPetsNotes',
      'toxicToHumans',
      'toxicToHumansNotes',
      'funFacts',
      'commonProblems',
      'origin',
      'commonNames',
    ],
    additionalProperties: false,
  },
};

type OpenAiPlantInfo = {
  description: string;
  wateringDescription: string;
  wateringDaysMin: number;
  wateringDaysMax: number;
  sunLevel: string;
  careLevel: string;
  toxicToPets: boolean;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean;
  toxicToHumansNotes: string | null;
  funFacts: string[];
  commonProblems: { issue: string; likelyCause: string }[];
  origin: string | null;
  commonNames: string[];
};

type ReferencePhoto = { url: string; sourceUrl: string };

type CommonsSearchResponse = {
  query?: {
    pages?: Record<
      string,
      {
        index: number;
        imageinfo?: { thumburl: string; descriptionurl: string; mime: string }[];
      }
    >;
  };
};

const REFERENCE_PHOTOS_LIMIT = 6;

async function fetchReferencePhotos(scientificName: string): Promise<ReferencePhoto[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: scientificName,
    gsrnamespace: '6',
    gsrlimit: String(REFERENCE_PHOTOS_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '800',
    format: 'json',
  });

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'broto-app/1.0 (https://github.com/byjhona/broto)' },
    });

    if (!response.ok) return [];

    const body = (await response.json()) as CommonsSearchResponse;
    const pages = Object.values(body.query?.pages ?? {}).sort((a, b) => b.index - a.index);

    return pages
      .map((page) => page.imageinfo?.[0])
      .filter((info): info is NonNullable<typeof info> => !!info && info.mime.startsWith('image/'))
      .map((info) => ({ url: info.thumburl, sourceUrl: info.descriptionurl }));
  } catch (error) {
    console.error('Erro buscando fotos de referência no Wikimedia Commons:', error);
    return [];
  }
}

async function fetchFromOpenAi(scientificName: string, commonName: string | null): Promise<OpenAiPlantInfo> {
  const content = await callOpenAI({
    messages: [
      {
        role: 'system',
        content:
          'Você é um especialista em botânica e jardinagem doméstica. Responda sempre em português do Brasil, com dados realistas para a espécie perguntada.',
      },
      {
        role: 'user',
        content: `Espécie: ${scientificName}${commonName ? ` (nome popular: ${commonName})` : ''}. Preencha os dados de cuidado, toxicidade, curiosidades, problemas comuns e nomes populares dessa planta.`,
      },
    ],
    response_format: { type: 'json_schema', json_schema: PLANT_INFO_JSON_SCHEMA },
  });

  return JSON.parse(content) as OpenAiPlantInfo;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { scientificName?: string; commonName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const scientificName = body.scientificName?.trim();
  if (!scientificName) {
    return new Response('Missing scientificName', { status: 400 });
  }

  const { data: cached } = await supabaseAdmin
    .from('plant_species_info')
    .select('*')
    .eq('scientific_name', scientificName)
    .maybeSingle();

  if (cached) {
    return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json' } });
  }

  let info: OpenAiPlantInfo;
  let referencePhotos: ReferencePhoto[];
  try {
    [info, referencePhotos] = await Promise.all([
      fetchFromOpenAi(scientificName, body.commonName ?? null),
      fetchReferencePhotos(scientificName),
    ]);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível buscar informações da planta', { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('plant_species_info')
    .upsert(
      {
        scientific_name: scientificName,
        description: info.description,
        watering_description: info.wateringDescription,
        watering_days_min: info.wateringDaysMin,
        watering_days_max: info.wateringDaysMax,
        sun_level: info.sunLevel,
        care_level: info.careLevel,
        toxic_to_pets: info.toxicToPets,
        toxic_to_pets_notes: info.toxicToPetsNotes,
        toxic_to_humans: info.toxicToHumans,
        toxic_to_humans_notes: info.toxicToHumansNotes,
        fun_facts: info.funFacts,
        common_problems: info.commonProblems,
        origin: info.origin,
        reference_photos: referencePhotos,
        common_names: info.commonNames,
      },
      { onConflict: 'scientific_name' }
    )
    .select()
    .single();

  if (insertError) {
    console.error('Erro salvando plant_species_info:', insertError);
    return new Response(
      JSON.stringify({
        scientific_name: scientificName,
        description: info.description,
        watering_description: info.wateringDescription,
        watering_days_min: info.wateringDaysMin,
        watering_days_max: info.wateringDaysMax,
        sun_level: info.sunLevel,
        care_level: info.careLevel,
        toxic_to_pets: info.toxicToPets,
        toxic_to_pets_notes: info.toxicToPetsNotes,
        toxic_to_humans: info.toxicToHumans,
        toxic_to_humans_notes: info.toxicToHumansNotes,
        fun_facts: info.funFacts,
        common_problems: info.commonProblems,
        origin: info.origin,
        reference_photos: referencePhotos,
        common_names: info.commonNames,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(inserted), { headers: { 'Content-Type': 'application/json' } });
});
