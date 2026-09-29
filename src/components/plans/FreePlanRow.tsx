import Gift from 'lucide-react-native/icons/gift';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import { Metrics, useColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlanCatalogItem } from '@/services';
import { planBenefits } from '@/utils';
import { IconBadge } from '../IconBadge';
import { InfoChip } from '../InfoChip';
import { ListRow } from '../ListRow';

const SUMMARY_BENEFITS = 2;

export function FreePlanRow({ plan, isCurrent }: Readonly<{ plan: PlanCatalogItem; isCurrent: boolean }>) {
  const colors = useColors();
  const { t } = useTranslation('credits');
  const summary = planBenefits(plan)
    .slice(0, SUMMARY_BENEFITS)
    .map((benefit) => benefit.text)
    .join(' · ');

  return (
    <ListRow
      variant="card"
      leading={
        <IconBadge size={Metrics.size.lg}>
          <Gift size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
      }
      eyebrow={t('free')}
      title={plan.name}
      subtitle={summary}
      trailing={isCurrent ? <InfoChip size="sm" icon={CircleCheck} value={t('yourPlan')} /> : undefined}
    />
  );
}
