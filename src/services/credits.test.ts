import { canAfford, type CreditsState } from './credits';

function makeCredits(overrides: Partial<CreditsState> = {}): CreditsState {
  return {
    planId: 'premium',
    planName: 'Broto+',
    monthlyCredits: 40,
    balance: 10,
    creditRenewalPeriod: 'weekly',
    maxActiveListings: null,
    maxEventsPerMonth: null,
    maxListingPhotos: null,
    ...overrides,
  };
}

describe('canAfford', () => {
  it('denies when credits are not loaded yet', () => {
    expect(canAfford(null, 2)).toBe(false);
  });

  it('always allows on an unlimited plan, regardless of balance', () => {
    const credits = makeCredits({ monthlyCredits: null, balance: null });
    expect(canAfford(credits, 999)).toBe(true);
  });

  it('allows when the balance covers the cost exactly', () => {
    const credits = makeCredits({ balance: 5 });
    expect(canAfford(credits, 5)).toBe(true);
  });

  it('denies when the balance is below the cost', () => {
    const credits = makeCredits({ balance: 4 });
    expect(canAfford(credits, 5)).toBe(false);
  });

  it('denies when the balance is missing on a metered plan', () => {
    const credits = makeCredits({ balance: null });
    expect(canAfford(credits, 1)).toBe(false);
  });
});
