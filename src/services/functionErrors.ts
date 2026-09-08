import { FunctionsHttpError } from '@supabase/supabase-js';

export async function toFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError && error.context) {
    const message = await error.context.text().catch(() => null);
    if (message) return new Error(message);
  }
  return error instanceof Error ? error : new Error('Erro desconhecido.');
}
