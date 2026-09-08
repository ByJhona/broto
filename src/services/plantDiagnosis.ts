import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import { toFunctionError } from './functionErrors';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
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
  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
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

export type DiagnosePlantResult = {
  diagnosis: PlantDiagnosis | null;
  newCreditBalance: number | null;
};

type DiagnoseResponse = (DiagnosisRow & { newCreditBalance: number | null }) | { isPlant: false; newCreditBalance: null };

export async function diagnosePlant(userId: string, photoUri: string): Promise<DiagnosePlantResult> {
  const photoUrl = await uploadDiagnosisPhoto(userId, photoUri);

  const { data, error } = await supabase.functions.invoke<DiagnoseResponse>('diagnose-plant', {
    body: { photoUrl },
  });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw await toFunctionError(error);
  }

  if (!data) {
    throw new Error('Não foi possível analisar a foto.');
  }

  if ('isPlant' in data && data.isPlant === false) {
    return { diagnosis: null, newCreditBalance: data.newCreditBalance };
  }

  const { newCreditBalance, ...row } = data as DiagnosisRow & { newCreditBalance: number | null };
  return { diagnosis: mapRow(row), newCreditBalance };
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
