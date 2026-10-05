import { StyleSheet, Text, View } from 'react-native';
import PawPrint from 'lucide-react-native/icons/paw-print';
import User from 'lucide-react-native/icons/user';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSpeciesInfo } from '@/types';
import { InfoSection } from '../InfoSection';

type SafetyRowProps = {
  icon: LucideIcon;
  isToxic: boolean;
  title: string;
  note: string | null;
};

function SafetyRow({ icon: Icon, isToxic, title, note }: Readonly<SafetyRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const tone = isToxic ? colors.destructive : colors.leaf;

  return (
    <View style={[styles.row, { backgroundColor: `${tone}12`, borderColor: `${tone}33` }]} accessible>
      <Icon size={Metrics.icon.small} color={tone} strokeWidth={Metrics.icon.stroke.regular} />
      <View style={styles.rowBody}>
        <Text style={[styles.title, { color: tone }]}>{title}</Text>
        {isToxic && note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

export function SafetySection({ info }: Readonly<{ info: PlantSpeciesInfo }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  return (
    <InfoSection title={t('safetyTitle')}>
      <View style={styles.list}>
        <SafetyRow
          icon={PawPrint}
          isToxic={info.toxicToPets}
          title={info.toxicToPets ? t('petsToxic') : t('petsSafe')}
          note={info.toxicToPetsNotes}
        />
        <SafetyRow
          icon={User}
          isToxic={info.toxicToHumans}
          title={info.toxicToHumans ? t('humansToxic') : t('humansSafe')}
          note={info.toxicToHumansNotes}
        />
      </View>
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: Metrics.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      borderWidth: Metrics.borderWidth.sm,
      padding: Metrics.spacing.md,
    },
    rowBody: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    title: {
      ...Typography.heading,
    },
    note: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
  });
