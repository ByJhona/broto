import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import type { PlantCandidate } from '@/types';

async function uploadIdentificationPhoto(localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) throw new Error('Usuário não autenticado.');

  const file = new File(localUri);
  const base64 = await file.base64();
  const path = `${user.id}/identifications/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, decode(base64), { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export async function identifyPlant(photoUri: string): Promise<PlantCandidate[]> {
  const photoUrl = await uploadIdentificationPhoto(photoUri);

  const { data, error } = await supabase.functions.invoke<PlantCandidate[]>('identify-plant', {
    body: { photoUrl },
  });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw error;
  }

  return data ?? [];
}
