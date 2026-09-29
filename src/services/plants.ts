import type { QueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { i18n } from '@/i18n';
import { ensureWriteApplied } from './writeGuard';
import { getCurrentUserId, supabase } from './supabase';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import { storagePathFromPublicUrl, uniquePhotoFilename } from './storagePath';
import type { Plant, PlantSummary } from '@/types';
import { patchInList, removeFromList } from '@/utils/queryListCache';

export const MAX_PLANT_PHOTOS = 5;

const PLANT_SUMMARY_SELECT = 'id, created_at, name, species, common_name, photo_urls, group_id, watering_days';

type PlantSummaryRow = {
  id: string;
  created_at: string;
  name: string;
  species: string | null;
  common_name: string | null;
  photo_urls: string[];
  group_id: string | null;
  watering_days: number | null;
};

function mapPlantSummaryRow(row: PlantSummaryRow): PlantSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrl: row.photo_urls[0] ?? null,
    groupId: row.group_id,
    wateringDays: row.watering_days,
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
  group_id: string | null;
  group: { name: string } | null;
};

const PLANT_SELECT = '*, group:plant_groups(name)';

function mapPlantRow(row: PlantRow): Plant {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrls: row.photo_urls,
    wateringDays: row.watering_days,
    groupId: row.group_id,
    groupName: row.group?.name ?? null,
  };
}

export async function getPlants(): Promise<PlantSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('plants')
    .select(PLANT_SUMMARY_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as PlantSummaryRow[]).map(mapPlantSummaryRow);
}

export async function setPlantGroup(plantId: string, groupId: string | null): Promise<void> {
  ensureWriteApplied(
    await supabase.from('plants').update({ group_id: groupId }, { count: 'exact' }).eq('id', plantId)
  );
}

export async function getPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase.from('plants').select(PLANT_SELECT).eq('id', id).is('deleted_at', null).single();

  if (error) {
    console.warn('Não foi possível buscar a planta no Supabase:', error);
    return null;
  }

  return mapPlantRow(data as PlantRow);
}

async function uploadPlantPhoto(plantId: string, localUri: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error(i18n.t('common:notAuthenticated'));

  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${userId}/${plantId}/${uniquePhotoFilename()}`;

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
  ensureWriteApplied(
    await supabase.from('plants').update({ deleted_at: new Date().toISOString() }, { count: 'exact' }).eq('id', plantId)
  );
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
    throw new Error(i18n.t('plant:maxPhotosError', { max: MAX_PLANT_PHOTOS }));
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
  ensureWriteApplied(
    await supabase.from('plants').update({ name }, { count: 'exact' }).eq('id', plantId)
  );
}

const PLANTS_QUERY_PREFIX = ['plants'] as const;

export function patchPlantInAllCaches(queryClient: QueryClient, id: string, patch: Partial<PlantSummary>) {
  queryClient.setQueriesData<PlantSummary[]>({ queryKey: PLANTS_QUERY_PREFIX }, (old) =>
    old ? patchInList(old, id, (item) => ({ ...item, ...patch })) : old
  );
  queryClient.setQueryData<Plant>(['plant', id], (current) => (current ? { ...current, ...patch } : current));
}

export function removePlantFromAllCaches(queryClient: QueryClient, id: string) {
  queryClient.setQueriesData<PlantSummary[]>({ queryKey: PLANTS_QUERY_PREFIX }, (old) => (old ? removeFromList(old, id) : old));
  queryClient.removeQueries({ queryKey: ['plant', id] });
}

export type CreatePlantInput = {
  name: string;
  species?: string | null;
  commonName?: string | null;
  wateringDays?: number | null;
  photoUri?: string | null;
  photoUrl?: string | null;
};

export async function createPlant(input: CreatePlantInput): Promise<Plant> {
  const { data: plant, error } = await supabase
    .from('plants')
    .insert({
      name: input.name,
      species: input.species ?? null,
      common_name: input.commonName ?? null,
      watering_days: input.wateringDays ?? null,
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
