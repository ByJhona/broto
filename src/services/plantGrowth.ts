import { File } from 'expo-file-system';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import { toFunctionError } from './functionErrors';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import type { PlantGrowthCheckin } from '@/types';

type CheckinRow = {
  id: string;
  plant_id: string;
  photo_url: string;
  observations: string[];
  created_at: string;
};

function mapRow(row: CheckinRow): PlantGrowthCheckin {
  return {
    id: row.id,
    plantId: row.plant_id,
    photoUrl: row.photo_url,
    observations: row.observations,
    createdAt: row.created_at,
  };
}

async function uploadCheckinPhoto(plantId: string, localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) throw new Error('Usuário não autenticado.');

  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${user.id}/${plantId}/checkins/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export type AnalyzePlantGrowthResult = {
  checkin: PlantGrowthCheckin;
  newCreditBalance: number | null;
};

export async function analyzePlantGrowth(plantId: string, photoUri: string): Promise<AnalyzePlantGrowthResult> {
  const photoUrl = await uploadCheckinPhoto(plantId, photoUri);

  const { data, error } = await supabase.functions.invoke<CheckinRow & { newCreditBalance: number | null }>(
    'analyze-plant-growth',
    { body: { plantId, photoUrl } }
  );

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw await toFunctionError(error);
  }

  if (!data) {
    throw new Error('Não foi possível analisar a foto.');
  }

  const { newCreditBalance, ...row } = data;
  return { checkin: mapRow(row), newCreditBalance };
}

export async function getPlantGrowthCheckins(plantId: string): Promise<PlantGrowthCheckin[]> {
  const { data, error } = await supabase
    .from('plant_growth_checkins')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Não foi possível buscar o histórico de crescimento:', error);
    return [];
  }

  return (data as CheckinRow[]).map(mapRow);
}
