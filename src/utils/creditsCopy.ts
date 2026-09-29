import { i18n } from '@/i18n';
import type { CreditsState } from '@/services/credits';

export function creditsBalanceTitle(credits: CreditsState | null): string {
  if (!credits) return i18n.t('credits:loadingCredits');
  if (credits.monthlyCredits == null) return i18n.t('credits:unlimitedCredits');
  return i18n.t('credits:creditsAvailable', { count: credits.balance });
}

export function creditsRenewalSubtitle(credits: CreditsState | null): string {
  if (!credits) return '';
  if (credits.monthlyCredits == null) return i18n.t('credits:planUsedForIdentification', { planName: credits.planName });
  const period = credits.creditRenewalPeriod === 'weekly' ? i18n.t('credits:week') : i18n.t('credits:month');
  return i18n.t('credits:planRenewsCredits', { planName: credits.planName, count: credits.monthlyCredits, period });
}

export function creditsBalanceLabel(credits: CreditsState): string {
  if (credits.monthlyCredits == null) return i18n.t('credits:unlimitedCredits');
  return i18n.t('credits:creditsBalance', { count: credits.balance ?? 0 });
}

export const CREDITS_NUDGE_ACTION = {
  IDENTIFY: 'identify',
  PLANS: 'plans',
} as const;

export type CreditsNudgeAction = (typeof CREDITS_NUDGE_ACTION)[keyof typeof CREDITS_NUDGE_ACTION];

export type CreditsNudge = {
  message: string;
  action: CreditsNudgeAction;
};

export function creditsNudge(credits: CreditsState, identificationCost: number): CreditsNudge {
  if (credits.monthlyCredits == null) {
    return { message: i18n.t('credits:nudgeUnlimited'), action: CREDITS_NUDGE_ACTION.IDENTIFY };
  }
  const identifications = Math.floor((credits.balance ?? 0) / Math.max(identificationCost, 1));
  if (identifications > 0) {
    return { message: i18n.t('credits:nudgeIdentifications', { count: identifications }), action: CREDITS_NUDGE_ACTION.IDENTIFY };
  }
  const renewalKey = credits.creditRenewalPeriod === 'weekly' ? 'credits:nudgeRenewsWeekly' : 'credits:nudgeRenewsMonthly';
  return { message: i18n.t(renewalKey), action: CREDITS_NUDGE_ACTION.PLANS };
}
