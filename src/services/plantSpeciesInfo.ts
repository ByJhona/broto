import { supabase } from './supabase';
import type { PlantSpeciesInfo } from '@/types';

type PlantSpeciesInfoRow = {
  scientific_name: string;
  description: string;
  watering_description: string;
  watering_days_min: number;
  watering_days_max: number;
  sun_level: PlantSpeciesInfo['sunLevel'];
  care_level: PlantSpeciesInfo['careLevel'];
  toxic_to_pets: boolean;
  toxic_to_pets_notes: string | null;
  toxic_to_humans: boolean;
  toxic_to_humans_notes: string | null;
  fun_facts: string[];
  common_problems: PlantSpeciesInfo['commonProblems'];
  origin: string | null;
};

function mapRow(row: PlantSpeciesInfoRow): PlantSpeciesInfo {
  return {
    scientificName: row.scientific_name,
    description: row.description,
    wateringDescription: row.watering_description,
    wateringDaysMin: row.watering_days_min,
    wateringDaysMax: row.watering_days_max,
    sunLevel: row.sun_level,
    careLevel: row.care_level,
    toxicToPets: row.toxic_to_pets,
    toxicToPetsNotes: row.toxic_to_pets_notes,
    toxicToHumans: row.toxic_to_humans,
    toxicToHumansNotes: row.toxic_to_humans_notes,
    funFacts: row.fun_facts,
    commonProblems: row.common_problems,
    origin: row.origin,
  };
}

export async function getPlantSpeciesInfo(
  scientificName: string,
  commonName?: string | null
): Promise<PlantSpeciesInfo | null> {
  const { data, error } = await supabase.functions.invoke<PlantSpeciesInfoRow>('plant-species-info', {
    body: { scientificName, commonName: commonName ?? undefined },
  });

  if (error || !data) {
    console.warn('Não foi possível buscar informações da espécie:', error);
    return null;
  }

  return mapRow(data);
}
