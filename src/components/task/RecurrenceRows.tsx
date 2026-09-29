import { StyleSheet, Switch, Text, View } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Repeat from 'lucide-react-native/icons/repeat';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconBadge } from '../IconBadge';
import { IconButton } from '../IconButton';
import { ListRow } from '../ListRow';

export const MIN_RECURRENCE_DAYS = 1;
export const MAX_RECURRENCE_DAYS = 365;

type RecurrenceRowsProps = {
  recurrenceDays: number | null;
  onToggleRepeat: (repeat: boolean) => void;
  onChangeDays: (days: number) => void;
};

export function RecurrenceToggleRow({ recurrenceDays, onToggleRepeat }: Readonly<Omit<RecurrenceRowsProps, 'onChangeDays'>>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('task');
  const isRepeating = recurrenceDays !== null;

  return (
    <ListRow
      style={styles.row}
      leading={
        <IconBadge>
          <Repeat size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
      }
      eyebrow={t('repeatLabel')}
      title={isRepeating ? t('everyDays', { count: recurrenceDays }) : t('onceOption')}
      trailing={
        <Switch
          value={isRepeating}
          onValueChange={onToggleRepeat}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.white}
          accessibilityLabel={t('repeatLabel')}
        />
      }
    />
  );
}

export function RecurrenceStepperRow({ recurrenceDays, onChangeDays }: Readonly<{ recurrenceDays: number; onChangeDays: (days: number) => void }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['task', 'common']);

  return (
    <View style={[styles.row, styles.stepperRow]}>
      <Text style={styles.stepperLabel}>{t('intervalLabel')}</Text>
      <View style={styles.stepper}>
        <IconButton
          accessibilityLabel={t('common:a11yDecreaseInterval')}
          size={Metrics.size.sm}
          style={styles.stepperButton}
          disabled={recurrenceDays <= MIN_RECURRENCE_DAYS}
          onPress={() => onChangeDays(Math.max(MIN_RECURRENCE_DAYS, recurrenceDays - 1))}
        >
          <Minus size={Metrics.icon.small} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
        </IconButton>
        <Text style={styles.stepperValue}>{t('daysCount', { count: recurrenceDays })}</Text>
        <IconButton
          accessibilityLabel={t('common:a11yIncreaseInterval')}
          size={Metrics.size.sm}
          style={styles.stepperButton}
          disabled={recurrenceDays >= MAX_RECURRENCE_DAYS}
          onPress={() => onChangeDays(Math.min(MAX_RECURRENCE_DAYS, recurrenceDays + 1))}
        >
          <Plus size={Metrics.icon.small} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
        </IconButton>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      paddingVertical: Metrics.spacing.md,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.md,
    },
    stepperLabel: {
      ...Typography.heading,
      color: colors.foreground,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    stepperButton: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperValue: {
      ...Typography.headingMedium,
      color: colors.foreground,
      minWidth: Metrics.size.xxl,
      textAlign: 'center',
    },
  });
