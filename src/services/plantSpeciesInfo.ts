import { supabase } from './supabase';
import type { PlantSpeciesInfo, PlantSpeciesSearchResult } from '@/types';

export const SPECIES_CONTENT_VERSION = 2;

type PlantSpeciesInfoRow = {
  id: string;
  scientific_name: string;
  common_names: string[] | null;
  family: string | null;
  plant_type: string;
  origin: string | null;
  description: string;
  care_level: PlantSpeciesInfo['careLevel'];
  growth_rate: PlantSpeciesInfo['growthRate'];
  mature_size: string;
  sun_level: PlantSpeciesInfo['sunLevel'];
  light_tip: string;
  watering_days_min: number;
  watering_days_max: number;
  watering_tip: string;
  humidity_level: PlantSpeciesInfo['humidityLevel'];
  humidity_tip: string;
  temperature_min_c: number;
  temperature_max_c: number;
  soil_tip: string;
  fertilizing_tip: string;
  propagation_methods: string[] | null;
  toxic_to_pets: boolean;
  toxic_to_pets_notes: string | null;
  toxic_to_humans: boolean;
  toxic_to_humans_notes: string | null;
  common_problems: PlantSpeciesInfo['commonProblems'] | null;
  fun_facts: string[] | null;
  reference_photos: PlantSpeciesInfo['referencePhotos'] | null;
  content_version: number;
};

function mapRow(row: PlantSpeciesInfoRow): PlantSpeciesInfo {
  return {
    scientificName: row.scientific_name,
    commonNames: row.common_names ?? [],
    family: row.family,
    plantType: row.plant_type,
    origin: row.origin,
    description: row.description,
    careLevel: row.care_level,
    growthRate: row.growth_rate,
    matureSize: row.mature_size,
    sunLevel: row.sun_level,
    lightTip: row.light_tip,
    wateringDaysMin: row.watering_days_min,
    wateringDaysMax: row.watering_days_max,
    wateringTip: row.watering_tip,
    humidityLevel: row.humidity_level,
    humidityTip: row.humidity_tip,
    temperatureMinC: row.temperature_min_c,
    temperatureMaxC: row.temperature_max_c,
    soilTip: row.soil_tip,
    fertilizingTip: row.fertilizing_tip,
    propagationMethods: row.propagation_methods ?? [],
    toxicToPets: row.toxic_to_pets,
    toxicToPetsNotes: row.toxic_to_pets_notes,
    toxicToHumans: row.toxic_to_humans,
    toxicToHumansNotes: row.toxic_to_humans_notes,
    commonProblems: row.common_problems ?? [],
    funFacts: row.fun_facts ?? [],
    referencePhotos: row.reference_photos ?? [],
  };
}

function mapSearchRow(row: PlantSpeciesInfoRow): PlantSpeciesSearchResult {
  return { ...mapRow(row), id: row.id };
}

export function plantSpeciesInfoQueryKey(scientificName: string) {
  return ['plant-species-info', scientificName] as const;
}

async function readCachedSpeciesInfo(scientificName: string): Promise<PlantSpeciesInfo | null> {
  const { data, error } = await supabase
    .from('plant_species_info')
    .select('*')
    .eq('scientific_name', scientificName)
    .gte('content_version', SPECIES_CONTENT_VERSION)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as PlantSpeciesInfoRow);
}

async function generateSpeciesInfo(scientificName: string, commonName: string | null): Promise<PlantSpeciesInfo> {
  const { data, error } = await supabase.functions.invoke<PlantSpeciesInfoRow>('plant-species-info', {
    body: { scientificName, commonName: commonName ?? undefined },
  });

  if (error || !data) {
    console.warn('Não foi possível buscar informações da espécie:', error);
    throw new Error('SPECIES_INFO_UNAVAILABLE');
  }

  return mapRow(data);
}

export async function getPlantSpeciesInfo(scientificName: string, commonName?: string | null): Promise<PlantSpeciesInfo> {
  return (await readCachedSpeciesInfo(scientificName)) ?? generateSpeciesInfo(scientificName, commonName ?? null);
}

export async function searchPlantSpecies(query: string): Promise<PlantSpeciesSearchResult[]> {
  const { data, error } = await supabase.rpc('search_plant_species', { search_query: query });

  if (error || !data) {
    console.warn('Não foi possível buscar plantas:', error);
    return [];
  }

  return (data as PlantSpeciesInfoRow[]).map(mapSearchRow);
}

const RECENTLY_CATALOGED_LIMIT = 5;

export async function getRecentlyCatalogedSpecies(): Promise<PlantSpeciesSearchResult[]> {
  const { data, error } = await supabase
    .from('plant_species_info')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(RECENTLY_CATALOGED_LIMIT);

  if (error || !data) {
    console.warn('Não foi possível buscar as espécies catalogadas recentemente:', error);
    return [];
  }

  return (data as PlantSpeciesInfoRow[]).map(mapSearchRow);
}
