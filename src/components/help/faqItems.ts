import Bell from 'lucide-react-native/icons/bell';
import Camera from 'lucide-react-native/icons/camera';
import Cloud from 'lucide-react-native/icons/cloud';
import Droplet from 'lucide-react-native/icons/droplet';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import Sun from 'lucide-react-native/icons/sun';
import Trash2 from 'lucide-react-native/icons/trash-2';
import type { LucideIcon } from 'lucide-react-native';
import type { CreditCosts } from '@/services';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type FaqItem = {
  id: string;
  icon: LucideIcon;
  question: string;
  answer: string;
};

export function getFaqItems(t: Translate, creditCosts: CreditCosts): FaqItem[] {
  return [
    {
      id: 'diagnose',
      icon: Stethoscope,
      question: t('faqDiagnoseQuestion'),
      answer: t('faqDiagnoseAnswer', { count: creditCosts.diagnosis }),
    },
    { id: 'identify', icon: Camera, question: t('faqIdentifyQuestion'), answer: t('faqIdentifyAnswer') },
    { id: 'care', icon: Droplet, question: t('faqCareQuestion'), answer: t('faqCareAnswer') },
    { id: 'sun', icon: Sun, question: t('faqSunQuestion'), answer: t('faqSunAnswer') },
    { id: 'watering', icon: Bell, question: t('faqWateringQuestion'), answer: t('faqWateringAnswer') },
    { id: 'delete', icon: Trash2, question: t('faqDeleteQuestion'), answer: t('faqDeleteAnswer') },
    { id: 'sync', icon: Cloud, question: t('faqSyncQuestion'), answer: t('faqSyncAnswer') },
  ];
}
