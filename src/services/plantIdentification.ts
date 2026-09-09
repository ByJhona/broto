import { File } from 'expo-file-system';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import { toFunctionError } from './functionErrors';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import type { PlantCandidate } from '@/types';

async function uploadIdentificationPhoto(localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) throw new Error('Usuário não autenticado.');

  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${user.id}/identifications/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

type IdentifyPlantResponse = {
  candidates: PlantCandidate[];
  newCreditBalance: number | null;
};

export type IdentifyPlantResult = {
  candidates: PlantCandidate[];
  newCreditBalance: number | null;
};

export async function identifyPlant(photoUri: string): Promise<IdentifyPlantResult> {
  const photoUrl = await uploadIdentificationPhoto(photoUri);

  const { data, error } = await supabase.functions.invoke<IdentifyPlantResponse>('identify-plant', {
    body: { photoUrl },
  });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw await toFunctionError(error);
  }

  return data ?? { candidates: [], newCreditBalance: null };
}
