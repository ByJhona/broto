import { StyleSheet, Text, View } from 'react-native';
import Droplet from 'lucide-react-native/icons/droplet';
import Droplets from 'lucide-react-native/icons/droplets';
import Gauge from 'lucide-react-native/icons/gauge';
import Ruler from 'lucide-react-native/icons/ruler';
import Shovel from 'lucide-react-native/icons/shovel';
import Sprout from 'lucide-react-native/icons/sprout';
import Sun from 'lucide-react-native/icons/sun';
import Thermometer from 'lucide-react-native/icons/thermometer';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSpeciesInfo } from '@/types';
import { sunLevelLabel } from '@/utils';
import { CardGroup } from '../CardGroup';
import { InfoChip } from '../InfoChip';
import { InfoSection } from '../InfoSection';
import { SegmentMeter } from './SegmentMeter';
import {
  careLevelLabel,
  growthRateLabel,
  humidityLabel,
  HUMIDITY_STEPS,
  SUN_LEVEL_STEPS,
  temperatureRangeLabel,
  wateringRangeLabel,
} from './speciesLabels';

type CareRowData = {
  key: string;
  icon: LucideIcon;
  label: string;
  value?: string;
  detail?: string;
  meter?: { value: number; total: number };
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

function buildCareRows(info: PlantSpeciesInfo, t: Translate): CareRowData[] {
  return [
    {
      key: 'light',
      icon: Sun,
      label: t('light'),
      value: sunLevelLabel(info.sunLevel),
      detail: info.lightTip,
      meter: { value: SUN_LEVEL_STEPS[info.sunLevel], total: 5 },
    },
    {
      key: 'watering',
      icon: Droplet,
      label: t('watering'),
      value: wateringRangeLabel(info.wateringDaysMin, info.wateringDaysMax, t),
      detail: info.wateringTip,
    },
    {
      key: 'humidity',
      icon: Droplets,
      label: t('humidity'),
      value: humidityLabel(info.humidityLevel, t),
      detail: info.humidityTip,
      meter: { value: HUMIDITY_STEPS[info.humidityLevel], total: 3 },
    },
    {
      key: 'temperature',
      icon: Thermometer,
      label: t('temperature'),
      value: temperatureRangeLabel(info.temperatureMinC, info.temperatureMaxC),
    },
    { key: 'soil', icon: Shovel, label: t('soil'), detail: info.soilTip },
    { key: 'fertilizing', icon: Sprout, label: t('fertilizing'), detail: info.fertilizingTip },
  ];
}

function CareRow({ row }: Readonly<{ row: CareRowData }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const Icon = row.icon;
  const spoken = [row.label, row.value, row.detail].filter(Boolean).join('. ');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={spoken}
    >
      <View style={styles.iconBadge}>
        <Icon size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.labelLine}>
          <Text style={styles.label}>{row.label}</Text>
          {row.meter ? <SegmentMeter value={row.meter.value} total={row.meter.total} /> : null}
        </View>
        {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
        {row.detail ? <Text style={row.value ? styles.detail : styles.detailStrong}>{row.detail}</Text> : null}
      </View>
    </View>
  );
}

export function CareProfileCard({ info }: Readonly<{ info: PlantSpeciesInfo }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');
  const rows = buildCareRows(info, t);

  return (
    <InfoSection title={t('careProfileTitle')}>
      <View style={styles.traits}>
        <InfoChip size="sm" icon={Gauge} value={careLevelLabel(info.careLevel, t)} />
        <InfoChip size="sm" icon={TrendingUp} value={growthRateLabel(info.growthRate, t)} />
        <InfoChip size="sm" icon={Ruler} value={info.matureSize} />
      </View>
      <CardGroup>
        {rows.map((row) => (
          <CareRow key={row.key} row={row} />
        ))}
      </CardGroup>
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    traits: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.xs,
      marginBottom: Metrics.spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
    },
    iconBadge: {
      width: Metrics.size.md,
      height: Metrics.size.md,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    labelLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.sm,
    },
    label: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    value: {
      ...Typography.heading,
      color: colors.foreground,
    },
    detail: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    detailStrong: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
  });
