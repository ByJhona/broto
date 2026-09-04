import { supabase } from './supabase';
import type { UserProfile } from '@/types';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

export async function searchProfiles(username: string, excludeUserId?: string | null): Promise<UserProfile[]> {
  const trimmed = username.trim();
  if (!trimmed) return [];

  let query = supabase.from('profiles').select('*').ilike('username', `%${trimmed}%`).limit(20);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();

  if (error) throw error;
  return !data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este nome de usuário já está em uso.');
    }
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const { File } = await import('expo-file-system');
  const { decode } = await import('base64-arraybuffer');

  const file = new File(localUri);
  const base64 = await file.base64();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  return `${publicUrl}?t=${Date.now()}`;
}
