import { i18n } from '@/i18n';
import type { CreditsState } from '@/services/credits';
import { CREDITS_NUDGE_ACTION, creditsNudge } from './creditsCopy';

function credits(overrides: Partial<CreditsState> = {}): CreditsState {
  return {
    planId: 'free',
    planName: 'Free',
    monthlyCredits: 15,
    balance: 12,
    creditRenewalPeriod: 'weekly',
    maxListingPhotos: 3,
    ...overrides,
  };
}

describe('creditsNudge', () => {
  it('turns the balance into how many identifications it pays for', () => {
    expect(creditsNudge(credits({ balance: 13 }), 2)).toEqual({
      message: i18n.t('credits:nudgeIdentifications', { count: 6 }),
      action: CREDITS_NUDGE_ACTION.IDENTIFY,
    });
  });

  it('points to plans when the balance cannot pay for an identification', () => {
    expect(creditsNudge(credits({ balance: 1 }), 2)).toEqual({
      message: i18n.t('credits:nudgeRenewsWeekly'),
      action: CREDITS_NUDGE_ACTION.PLANS,
    });
  });

  it('invites unlimited plans to keep identifying', () => {
    expect(creditsNudge(credits({ monthlyCredits: null, balance: null }), 2)).toEqual({
      message: i18n.t('credits:nudgeUnlimited'),
      action: CREDITS_NUDGE_ACTION.IDENTIFY,
    });
  });
});
