import { FunctionsHttpError } from '@supabase/supabase-js';
import { i18n } from '@/i18n';
import { supabase } from './supabase';
import { InsufficientCreditsError } from './credits';
import { toFunctionError } from './functionErrors';

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

function mapRow(row: PlantChatMessageRow): PlantChatMessage {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}

export type AskPlantQuestionResult = {
  message: PlantChatMessage;
  sessionId: string;
  newCreditBalance: number | null;
};

export async function askPlantQuestion(
  plantId: string | null,
  question: string,
  sessionId: string | null
): Promise<AskPlantQuestionResult> {
  const { data, error } = await supabase.functions.invoke<
    PlantChatMessageRow & { sessionId: string; newCreditBalance: number | null }
  >('plant-chat', { body: { plantId: plantId ?? undefined, question, sessionId: sessionId ?? undefined } });

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 402) {
      throw new InsufficientCreditsError();
    }
    throw await toFunctionError(error);
  }

  if (!data) throw new Error(i18n.t('plant:chatNoResponseError'));

  const { newCreditBalance, sessionId: returnedSessionId, ...row } = data;
  return { message: mapRow(row), sessionId: returnedSessionId, newCreditBalance };
}
