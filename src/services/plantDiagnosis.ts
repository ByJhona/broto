import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import type { PlantDiagnosis } from '@/types';

type DiagnosisRow = {
  id: string;
  photo_url: string;
  health_status: PlantDiagnosis['healthStatus'];
  summary: string;
  issues: PlantDiagnosis['issues'];
  recommended_actions: string[];
  created_at: string;
};

function mapRow(row: DiagnosisRow): PlantDiagnosis {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    healthStatus: row.health_status,
    summary: row.summary,
    issues: row.issues ?? [],
    recommendedActions: row.recommended_actions ?? [],
    createdAt: row.created_at,
  };
}

async function uploadDiagnosisPhoto(userId: string, localUri: string): Promise<string> {
  const file = new File(localUri);
  const base64 = await file.base64();
  const path = `${userId}/diagnoses/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, decode(base64), { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export async function diagnosePlant(userId: string, photoUri: string): Promise<PlantDiagnosis | null> {
  const photoUrl = await uploadDiagnosisPhoto(userId, photoUri);

  const { data, error } = await supabase.functions.invoke<DiagnosisRow | { isPlant: false }>('diagnose-plant', {
    body: { photoUrl },
  });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw error;
  }

  if (!data) {
    throw new Error('Não foi possível analisar a foto.');
  }

  if ('isPlant' in data && data.isPlant === false) {
    return null;
  }

  return mapRow(data as DiagnosisRow);
}

export async function getDiagnosisHistory(userId: string): Promise<PlantDiagnosis[]> {
  const { data, error } = await supabase
    .from('plant_diagnoses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('Não foi possível buscar o histórico de diagnósticos:', error);
    return [];
  }

  return (data as DiagnosisRow[]).map(mapRow);
}
