import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { deleteCareTasksByPlantId } from './careTasks';
import type { Plant } from '@/types';

const PLANTS_CACHE_KEY = '@broto/plants_cache';

async function readCachedPlants(userId: string): Promise<Plant[]> {
  const raw = await AsyncStorage.getItem(`${PLANTS_CACHE_KEY}/${userId}`);
  return raw ? (JSON.parse(raw) as Plant[]) : [];
}

async function writeCachedPlants(userId: string, plants: Plant[]): Promise<void> {
  await AsyncStorage.setItem(`${PLANTS_CACHE_KEY}/${userId}`, JSON.stringify(plants));
}

type PlantRow = {
  id: string;
  created_at: string;
  name: string;
  species: string | null;
  common_name: string | null;
  photo_url: string | null;
  watering_days: number | null;
  sun_level: Plant['sunLevel'];
  origin: string | null;
};

function mapPlantRow(row: PlantRow): Plant {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrl: row.photo_url,
    wateringDays: row.watering_days,
    sunLevel: row.sun_level,
    origin: row.origin,
  };
}

export async function getPlants(): Promise<Plant[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) return [];

  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Não foi possível buscar plantas do Supabase, usando cache local:', error);
    return readCachedPlants(user.id);
  }

  const plants = (data as PlantRow[]).map(mapPlantRow);
  await writeCachedPlants(user.id, plants);

  return plants;
}

export async function getPlantsByUserId(userId: string): Promise<Plant[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching plants for user:', error);
    throw error;
  }

  return (data as PlantRow[]).map(mapPlantRow);
}

export async function getPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase.from('plants').select('*').eq('id', id).single();

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

  const file = new File(localUri);
  const base64 = await file.base64();
  const path = `${user.id}/${plantId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export async function deletePlant(plantId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (user) {
    await supabase.storage.from('plant-photos').remove([`${user.id}/${plantId}.jpg`]);
  }

  const { error } = await supabase.from('plants').delete().eq('id', plantId);
  if (error) throw error;

  await deleteCareTasksByPlantId(plantId);
}

export async function updatePlantPhoto(plantId: string, localUri: string): Promise<string> {
  const photoUrl = await uploadPlantPhoto(plantId, localUri);

  const { error } = await supabase.from('plants').update({ photo_url: photoUrl }).eq('id', plantId);
  if (error) throw error;

  return photoUrl;
}

type CreatePlantInput = {
  name: string;
  species?: string | null;
  commonName?: string | null;
  wateringDays?: number | null;
  photoUri?: string | null;
  photoUrl?: string | null;
  sunLevel?: Plant['sunLevel'];
  origin?: string | null;
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
    })
    .select()
    .single();

  if (error) throw error;

  let photoUrl: string | null = input.photoUrl ?? null;
  if (!photoUrl && input.photoUri) {
    photoUrl = await uploadPlantPhoto(plant.id, input.photoUri);
  }

  if (photoUrl) {
    const { error: photoError } = await supabase
      .from('plants')
      .update({ photo_url: photoUrl })
      .eq('id', plant.id);

    if (photoError) throw photoError;
  }

  return mapPlantRow({ ...(plant as PlantRow), photo_url: photoUrl });
}
