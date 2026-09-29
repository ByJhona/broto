import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { callOpenAI } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CONTENT_VERSION = 2;

const shortText = (description: string) => ({ type: 'string', description });
const nullableText = (description: string) => ({ type: ['string', 'null'], description });

function objectSchema(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const textList = (description: string, minItems: number, maxItems: number) => ({
  type: 'array',
  items: { type: 'string' },
  description,
  minItems,
  maxItems,
});

const identityProperties = {
  commonNames: textList('Nomes populares no Brasil, do mais usado ao menos usado.', 1, 4),
  family: nullableText('Família botânica, ex: "Araceae".'),
  plantType: shortText('Tipo da planta em 2 a 4 palavras, ex: "Trepadeira tropical", "Suculenta", "Arbusto florífero".'),
  origin: nullableText('Região de origem em poucas palavras, ex: "Florestas tropicais do Sudeste Asiático".'),
  description: shortText('2 a 3 frases para quem está começando: o que é essa planta e o que a torna especial.'),
  funFacts: textList('Curiosidades interessantes sobre a planta, 1 frase cada.', 2, 3),
};

const careProperties = {
  careLevel: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
  growthRate: { type: 'string', enum: ['slow', 'medium', 'fast'] },
  matureSize: shortText('Porte adulto dentro de casa, curto, ex: "Até 2 m com tutor".'),
  sunLevel: { type: 'string', enum: ['shade', 'partial_shade', 'medium', 'bright_indirect', 'full_sun'] },
  lightTip: shortText('Onde colocar dentro de casa, 1 a 2 frases práticas.'),
  wateringDaysMin: { type: 'integer', description: 'Menor intervalo típico entre regas, em dias, dentro de casa no Brasil.' },
  wateringDaysMax: { type: 'integer', description: 'Maior intervalo típico entre regas, em dias, dentro de casa no Brasil.' },
  wateringTip: shortText('Como saber a hora de regar e como regar, 1 a 2 frases concretas (ex: tocar os 2 cm de cima do substrato).'),
  humidityLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
  humidityTip: shortText('Como lidar com a umidade do ar, 1 frase.'),
  temperatureMinC: { type: 'integer', description: 'Temperatura mínima confortável em °C.' },
  temperatureMaxC: { type: 'integer', description: 'Temperatura máxima confortável em °C.' },
  soilTip: shortText('Substrato ideal com a mistura sugerida, 1 frase.'),
  fertilizingTip: shortText('Quando e com o que adubar, 1 frase.'),
};

const safetyProperties = {
  toxicToPets: { type: 'boolean', description: 'true se for tóxica para cães ou gatos. Na dúvida, considere tóxica.' },
  toxicToPetsNotes: nullableText('O que acontece e o que fazer se o pet ingerir, 1 frase. null se não for tóxica.'),
  toxicToHumans: { type: 'boolean', description: 'true se for tóxica para pessoas. Na dúvida, considere tóxica.' },
  toxicToHumansNotes: nullableText('O que acontece e o cuidado necessário, 1 frase. null se não for tóxica.'),
  commonProblems: {
    type: 'array',
    items: objectSchema({
      symptom: shortText('O que a pessoa vê na planta, ex: "Folhas amarelando".'),
      cause: shortText('Causa mais provável, curta.'),
      solution: shortText('O que fazer, 1 frase prática.'),
    }),
    minItems: 2,
    maxItems: 4,
  },
  propagationMethods: textList(
    'Formas de fazer mudas em casa, cada uma com o passo principal, ex: "Estaca com um nó, enraizada na água". Lista vazia se não for viável em casa.',
    0,
    3
  ),
};

type ProfilePart = {
  name: string;
  request: string;
  properties: Record<string, unknown>;
};

const PROFILE_PARTS: ProfilePart[] = [
  { name: 'plant_identity', request: 'Preencha a identificação e a descrição dessa planta.', properties: identityProperties },
  { name: 'plant_care', request: 'Preencha os cuidados dessa planta dentro de casa.', properties: careProperties },
  { name: 'plant_safety', request: 'Preencha a toxicidade, os problemas comuns e as formas de fazer mudas dessa planta.', properties: safetyProperties },
];

type OpenAiPlantProfile = {
  commonNames: string[];
  family: string | null;
  plantType: string;
  origin: string | null;
  description: string;
  careLevel: string;
  growthRate: string;
  matureSize: string;
  sunLevel: string;
  lightTip: string;
  wateringDaysMin: number;
  wateringDaysMax: number;
  wateringTip: string;
  humidityLevel: string;
  humidityTip: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  soilTip: string;
  fertilizingTip: string;
  propagationMethods: string[];
  toxicToPets: boolean;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean;
  toxicToHumansNotes: string | null;
  commonProblems: { symptom: string; cause: string; solution: string }[];
  funFacts: string[];
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
const WATERING_DAYS_RANGE = { min: 1, max: 60 };
const TEMPERATURE_RANGE = { min: -10, max: 45 };

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

const SYSTEM_PROMPT = [
  'Você é um especialista em botânica e jardinagem doméstica escrevendo a ficha de cuidados de uma planta para um app brasileiro.',
  'O público vai de quem nunca cuidou de uma planta até colecionadores. Escreva em português do Brasil, com frases curtas, concretas e sem jargão; quando usar um termo técnico, explique.',
  'Considere a planta cultivada dentro de casa ou em varanda, no clima do Brasil.',
  'Os dados precisam ser realistas para a espécie. Em toxicidade, seja conservador: na dúvida, considere tóxica.',
  'Não use markdown nem emojis.',
].join(' ');

async function fetchProfilePart(part: ProfilePart, speciesLabel: string): Promise<Record<string, unknown>> {
  const content = await callOpenAI({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Espécie: ${speciesLabel}. ${part.request}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: part.name, strict: true, schema: objectSchema(part.properties) },
    },
  });

  return JSON.parse(content) as Record<string, unknown>;
}

async function fetchFromOpenAi(scientificName: string, commonName: string | null): Promise<OpenAiPlantProfile> {
  const speciesLabel = commonName ? `${scientificName} (nome popular: ${commonName})` : scientificName;
  const parts = await Promise.all(PROFILE_PARTS.map((part) => fetchProfilePart(part, speciesLabel)));
  return Object.assign({}, ...parts) as OpenAiPlantProfile;
}

function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

function orderedPair(first: number, second: number, range: { min: number; max: number }): [number, number] {
  const a = clamp(first, range);
  const b = clamp(second, range);
  return a <= b ? [a, b] : [b, a];
}

function toRow(scientificName: string, profile: OpenAiPlantProfile, referencePhotos: ReferencePhoto[]) {
  const [wateringDaysMin, wateringDaysMax] = orderedPair(profile.wateringDaysMin, profile.wateringDaysMax, WATERING_DAYS_RANGE);
  const [temperatureMinC, temperatureMaxC] = orderedPair(profile.temperatureMinC, profile.temperatureMaxC, TEMPERATURE_RANGE);

  return {
    scientific_name: scientificName,
    common_names: profile.commonNames,
    family: profile.family,
    plant_type: profile.plantType,
    origin: profile.origin,
    description: profile.description,
    care_level: profile.careLevel,
    growth_rate: profile.growthRate,
    mature_size: profile.matureSize,
    sun_level: profile.sunLevel,
    light_tip: profile.lightTip,
    watering_days_min: wateringDaysMin,
    watering_days_max: wateringDaysMax,
    watering_tip: profile.wateringTip,
    humidity_level: profile.humidityLevel,
    humidity_tip: profile.humidityTip,
    temperature_min_c: temperatureMinC,
    temperature_max_c: temperatureMaxC,
    soil_tip: profile.soilTip,
    fertilizing_tip: profile.fertilizingTip,
    propagation_methods: profile.propagationMethods,
    toxic_to_pets: profile.toxicToPets,
    toxic_to_pets_notes: profile.toxicToPets ? profile.toxicToPetsNotes : null,
    toxic_to_humans: profile.toxicToHumans,
    toxic_to_humans_notes: profile.toxicToHumans ? profile.toxicToHumansNotes : null,
    common_problems: profile.commonProblems,
    fun_facts: profile.funFacts,
    reference_photos: referencePhotos,
    content_version: CONTENT_VERSION,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
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
    .gte('content_version', CONTENT_VERSION)
    .maybeSingle();

  if (cached) return jsonResponse(cached);

  let row: ReturnType<typeof toRow>;
  try {
    const [profile, referencePhotos] = await Promise.all([
      fetchFromOpenAi(scientificName, body.commonName ?? null),
      fetchReferencePhotos(scientificName),
    ]);
    row = toRow(scientificName, profile, referencePhotos);
  } catch (error) {
    console.error('Erro consultando a OpenAI:', error);
    return new Response('Não foi possível buscar informações da planta', { status: 502 });
  }

  const { data: saved, error: saveError } = await supabaseAdmin
    .from('plant_species_info')
    .upsert(row, { onConflict: 'scientific_name' })
    .select()
    .single();

  if (saveError) {
    console.error('Erro salvando plant_species_info:', saveError);
    return jsonResponse(row);
  }

  return jsonResponse(saved);
});
