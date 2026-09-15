import { i18n } from '@/i18n';
import { InsufficientCreditsError } from './credits';
import { supabase } from './supabase';

export type BoostableContentType = 'post' | 'listing' | 'event';

export const BOOST_DURATION_HOURS = 48;

export function isBoostActive(boostedUntil: string | null): boolean {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

export async function boostContent(contentType: BoostableContentType, contentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('boost_content', { p_content_type: contentType, p_content_id: contentId });

  if (error) {
    if (error.message === 'insufficient_credits') throw new InsufficientCreditsError();
    throw new Error(i18n.t('common:genericError'));
  }

  return data as string;
}
