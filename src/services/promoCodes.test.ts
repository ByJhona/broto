import { normalizePromoCode, PROMO_CODE_ERROR, promoCodeErrorKind } from './promoCodes';

jest.mock('./supabase', () => ({ supabase: {} }));

describe('promoCodeErrorKind', () => {
  it('maps database errors to known kinds', () => {
    expect(promoCodeErrorKind('ERROR: invalid_code')).toBe(PROMO_CODE_ERROR.INVALID);
    expect(promoCodeErrorKind('already_redeemed')).toBe(PROMO_CODE_ERROR.ALREADY_REDEEMED);
    expect(promoCodeErrorKind('too_many_attempts')).toBe(PROMO_CODE_ERROR.TOO_MANY_ATTEMPTS);
  });

  it('falls back to unknown for anything else', () => {
    expect(promoCodeErrorKind('connection reset')).toBe(PROMO_CODE_ERROR.UNKNOWN);
  });
});

describe('normalizePromoCode', () => {
  it('trims and uppercases the code', () => {
    expect(normalizePromoCode('  broto-7k3f ')).toBe('BROTO-7K3F');
  });
});
