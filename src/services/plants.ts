import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { deleteCareTasksByPlantId } from './careTasks';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import { storagePathFromPublicUrl, uniquePhotoFilename } from './storagePath';
import type { Plant, PlantCommonProblem, PlantSummary } from '@/types';

export const MAX_PLANT_PHOTOS = 5;

const PLANT_SUMMARY_SELECT = 'id, created_at, name, species, common_name, photo_urls, watering_days, sun_level';

type PlantSummaryRow = {
  id: string;
  created_at: string;
  name: string;
  species: string | null;
  common_name: string | null;
  photo_urls: string[];
  watering_days: number | null;
  sun_level: Plant['sunLevel'];
};

function mapPlantSummaryRow(row: PlantSummaryRow): PlantSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrl: row.photo_urls[0] ?? null,
    wateringDays: row.watering_days,
    sunLevel: row.sun_level,
  };
}

type PlantRow = {
  id: string;
  created_at: string;
  name: string;
  species: string | null;
  common_name: string | null;
  photo_urls: string[];
  watering_days: number | null;
  sun_level: Plant['sunLevel'];
  origin: string | null;
  description: string | null;
  watering_description: string | null;
  care_level: Plant['careLevel'];
  toxic_to_pets: boolean | null;
  toxic_to_pets_notes: string | null;
  toxic_to_humans: boolean | null;
  toxic_to_humans_notes: string | null;
  fun_facts: string[] | null;
  common_problems: PlantCommonProblem[] | null;
};

function mapPlantRow(row: PlantRow): Plant {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrls: row.photo_urls,
    wateringDays: row.watering_days,
    sunLevel: row.sun_level,
    origin: row.origin,
    description: row.description,
    wateringDescription: row.watering_description,
    careLevel: row.care_level,
    toxicToPets: row.toxic_to_pets,
    toxicToPetsNotes: row.toxic_to_pets_notes,
    toxicToHumans: row.toxic_to_humans,
    toxicToHumansNotes: row.toxic_to_humans_notes,
    funFacts: row.fun_facts,
    commonProblems: row.common_problems,
  };
}

export async function getPlants(): Promise<PlantSummary[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) return [];

  const { data, error } = await supabase
    .from('plants')
    .select(PLANT_SUMMARY_SELECT)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as PlantSummaryRow[]).map(mapPlantSummaryRow);
}

export async function getPlantsByUserId(userId: string): Promise<PlantSummary[]> {
  const { data, error } = await supabase
    .from('plants')
    .select(PLANT_SUMMARY_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching plants for user:', error);
    throw error;
  }

  return (data as PlantSummaryRow[]).map(mapPlantSummaryRow);
}

export async function getPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase.from('plants').select('*').eq('id', id).is('deleted_at', null).single();

  if (error) {
    console.warn('Não foi possível buscar a planta no Supabase:', error);
    return null;
  }

  return mapPlantRow(data as PlantRow);
}

async function uploadPlantPhoto(plantId: string, localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) throw new Error('Usuário não autenticado.');

  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${user.id}/${plantId}/${uniquePhotoFilename()}`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export async function deletePlant(plantId: string): Promise<void> {
  const { error } = await supabase.from('plants').update({ deleted_at: new Date().toISOString() }).eq('id', plantId);
  if (error) throw error;

  await deleteCareTasksByPlantId(plantId);
}

export async function addPlantPhoto(plantId: string, localUri: string): Promise<Plant> {
  const { data: current, error: readError } = await supabase
    .from('plants')
    .select('photo_urls')
    .eq('id', plantId)
    .single();
  if (readError) throw readError;

  const existingPhotoUrls = (current as { photo_urls: string[] }).photo_urls;
  if (existingPhotoUrls.length >= MAX_PLANT_PHOTOS) {
    throw new Error(`Você pode adicionar no máximo ${MAX_PLANT_PHOTOS} fotos.`);
  }

  const photoUrl = await uploadPlantPhoto(plantId, localUri);
  const photoUrls = [...existingPhotoUrls, photoUrl];

  const { data, error } = await supabase.from('plants').update({ photo_urls: photoUrls }).eq('id', plantId).select().single();
  if (error) throw error;

  return mapPlantRow(data as PlantRow);
}

export async function removePlantPhoto(plantId: string, photoUrl: string): Promise<Plant> {
  const { data: current, error: readError } = await supabase
    .from('plants')
    .select('photo_urls')
    .eq('id', plantId)
    .single();
  if (readError) throw readError;

  const photoUrls = (current as { photo_urls: string[] }).photo_urls.filter((url) => url !== photoUrl);

  const { data, error } = await supabase.from('plants').update({ photo_urls: photoUrls }).eq('id', plantId).select().single();
  if (error) throw error;

  const path = storagePathFromPublicUrl('plant-photos', photoUrl);
  if (path) {
    await supabase.storage.from('plant-photos').remove([path]);
  }

  return mapPlantRow(data as PlantRow);
}

export async function updatePlantName(plantId: string, name: string): Promise<void> {
  const { error } = await supabase.from('plants').update({ name }).eq('id', plantId);
  if (error) throw error;
}

export type CreatePlantInput = {
  name: string;
  species?: string | null;
  commonName?: string | null;
  wateringDays?: number | null;
  photoUri?: string | null;
  photoUrl?: string | null;
  sunLevel?: Plant['sunLevel'];
  origin?: string | null;
  description?: string | null;
  wateringDescription?: string | null;
  careLevel?: Plant['careLevel'];
  toxicToPets?: boolean | null;
  toxicToPetsNotes?: string | null;
  toxicToHumans?: boolean | null;
  toxicToHumansNotes?: string | null;
  funFacts?: string[] | null;
  commonProblems?: PlantCommonProblem[] | null;
};

export async function createPlant(input: CreatePlantInput): Promise<Plant> {
  const { data: plant, error } = await supabase
    .from('plants')
    .insert({
      name: input.name,
      species: input.species ?? null,
      common_name: input.commonName ?? null,
      sun_level: input.sunLevel ?? null,
      origin: input.origin ?? null,
      watering_days: input.wateringDays ?? null,
      description: input.description ?? null,
      watering_description: input.wateringDescription ?? null,
      care_level: input.careLevel ?? null,
      toxic_to_pets: input.toxicToPets ?? null,
      toxic_to_pets_notes: input.toxicToPetsNotes ?? null,
      toxic_to_humans: input.toxicToHumans ?? null,
      toxic_to_humans_notes: input.toxicToHumansNotes ?? null,
      fun_facts: input.funFacts ?? null,
      common_problems: input.commonProblems ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    let photoUrl: string | null = input.photoUrl ?? null;
    if (!photoUrl && input.photoUri) {
      photoUrl = await uploadPlantPhoto(plant.id, input.photoUri);
    }

    const photoUrls = photoUrl ? [photoUrl] : [];

    if (photoUrls.length > 0) {
      const { error: photoError } = await supabase
        .from('plants')
        .update({ photo_urls: photoUrls })
        .eq('id', plant.id);

      if (photoError) throw photoError;
    }

    return mapPlantRow({ ...(plant as PlantRow), photo_urls: photoUrls });
  } catch (photoErr) {
    await supabase.from('plants').delete().eq('id', plant.id);
    throw photoErr;
  }
}
