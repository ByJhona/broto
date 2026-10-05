import { supabase } from './supabase';

export const PROMO_CODE_ERROR = {
  INVALID: 'invalid_code',
  EXPIRED: 'expired_code',
  EXHAUSTED: 'code_exhausted',
  ALREADY_REDEEMED: 'already_redeemed',
  UNKNOWN: 'unknown',
} as const;

export type PromoCodeErrorKind = (typeof PROMO_CODE_ERROR)[keyof typeof PROMO_CODE_ERROR];

const KNOWN_ERRORS: PromoCodeErrorKind[] = [
  PROMO_CODE_ERROR.INVALID,
  PROMO_CODE_ERROR.EXPIRED,
  PROMO_CODE_ERROR.EXHAUSTED,
  PROMO_CODE_ERROR.ALREADY_REDEEMED,
];

export class PromoCodeError extends Error {
  constructor(public readonly kind: PromoCodeErrorKind) {
    super(kind);
    this.name = 'PromoCodeError';
  }
}

export type PromoCodeReward = {
  campaignName: string;
  credits: number;
  luckyNumber: number | null;
  creditBalance: number | null;
};

export const LUCKY_NUMBERS_QUERY_KEY = 'lucky-numbers';

export type LuckyNumber = {
  campaignId: string;
  campaignName: string;
  luckyNumber: number;
  endsAt: string | null;
  drawnAt: string | null;
  isWinner: boolean;
  contactUserId: string | null;
};

type LuckyNumberRow = {
  campaign_id: string;
  campaign_name: string;
  lucky_number: number;
  ends_at: string | null;
  drawn_at: string | null;
  is_winner: boolean;
  contact_user_id: string | null;
};

export async function getMyLuckyNumbers(): Promise<LuckyNumber[]> {
  const { data, error } = await supabase.rpc('get_my_lucky_numbers');
  if (error) throw error;

  return (data as LuckyNumberRow[]).map((row) => ({
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    luckyNumber: row.lucky_number,
    endsAt: row.ends_at,
    drawnAt: row.drawn_at,
    isWinner: row.is_winner,
    contactUserId: row.contact_user_id,
  }));
}

export function formatLuckyNumber(luckyNumber: number): string {
  return `#${String(luckyNumber).padStart(4, '0')}`;
}

export function promoCodeErrorKind(message: string): PromoCodeErrorKind {
  return KNOWN_ERRORS.find((kind) => message.includes(kind)) ?? PROMO_CODE_ERROR.UNKNOWN;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function redeemPromoCode(code: string): Promise<PromoCodeReward> {
  const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: normalizePromoCode(code) });

  if (error) {
    const kind = promoCodeErrorKind(error.message);
    if (kind === PROMO_CODE_ERROR.UNKNOWN) console.error(error);
    throw new PromoCodeError(kind);
  }

  return data as PromoCodeReward;
}
