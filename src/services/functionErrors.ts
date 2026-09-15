import { FunctionsHttpError } from '@supabase/supabase-js';
import { i18n } from '@/i18n';

export async function toFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError && error.context) {
    if (error.context.status === 401) {
      return new Error(i18n.t('common:notAuthenticated'));
    }

    const message = await error.context.text().catch(() => null);
    if (message) return new Error(message);
  }
  return error instanceof Error ? error : new Error('Erro desconhecido.');
}
