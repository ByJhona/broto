import AsyncStorage from '@react-native-async-storage/async-storage';
import { today } from '@/utils';
import { supabase } from './supabase';

type DailyMessageRow = {
  message: string;
};

type CachedDailyMessage = {
  date: string;
  message: string;
};

const CACHE_KEY = '@broto/daily_message';

export async function getDailyMessage(): Promise<string> {
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached) as CachedDailyMessage;
    if (parsed.date === today()) return parsed.message;
  }

  const { data, error } = await supabase.functions.invoke<DailyMessageRow>('daily-message');

  if (error || !data) {
    throw error ?? new Error('Não foi possível buscar a mensagem do dia.');
  }

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), message: data.message }));

  return data.message;
}
