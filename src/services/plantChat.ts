import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';

export type PlantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type PlantChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

const MAX_VISIBLE_MESSAGES = 50;

function mapRow(row: PlantChatMessageRow): PlantChatMessage {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}

export async function getPlantChatMessages(plantId: string): Promise<PlantChatMessage[]> {
  const { data, error } = await supabase
    .from('plant_chat_messages')
    .select('id, role, content, created_at')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(MAX_VISIBLE_MESSAGES);

  if (error) throw error;
  return (data as PlantChatMessageRow[]).map(mapRow).reverse();
}

export async function askPlantQuestion(plantId: string, question: string): Promise<PlantChatMessage> {
  const { data, error } = await supabase.functions.invoke<PlantChatMessageRow>('plant-chat', {
    body: { plantId, question },
  });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw error;
  }

  if (!data) throw new Error('Não foi possível obter uma resposta.');

  return mapRow(data);
}
