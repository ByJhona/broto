import { StyleSheet, Text, View } from 'react-native';
import Globe from 'lucide-react-native/icons/globe';
import Leaf from 'lucide-react-native/icons/leaf';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSpeciesInfo } from '@/types';
import { InfoSection } from '../InfoSection';

type FactLineProps = {
  icon: LucideIcon;
  label: string;
  value: string | null;
};

function FactLine({ icon: Icon, label, value }: Readonly<FactLineProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!value) return null;

  return (
    <View style={styles.factLine}>
      <Icon size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.factText}>
        <Text style={styles.factLabel}>{label} </Text>
        {value}
      </Text>
    </View>
  );
}

export function AboutSpeciesSection({ info }: Readonly<{ info: PlantSpeciesInfo }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  return (
    <InfoSection title={t('aboutTitle')}>
      <Text style={styles.description}>{info.description}</Text>

      <View style={styles.facts}>
        <FactLine icon={Globe} label={t('originLabel')} value={info.origin} />
        <FactLine icon={Leaf} label={t('familyLabel')} value={info.family} />
      </View>

      {info.funFacts.length > 0 ? (
        <View style={styles.funFacts}>
          <View style={styles.funFactsHeader}>
            <Lightbulb size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.funFactsTitle}>{t('funFactsTitle')}</Text>
          </View>
          {info.funFacts.map((fact) => (
            <Text key={fact} style={styles.funFact}>
              {fact}
            </Text>
          ))}
        </View>
      ) : null}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    description: {
      ...Typography.body,
      color: colors.foreground,
    },
    facts: {
      gap: Metrics.spacing.xs,
      marginTop: Metrics.spacing.md,
    },
    factLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    factText: {
      flex: 1,
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    factLabel: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    funFacts: {
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.lg,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      backgroundColor: colors.muted,
    },
    funFactsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    funFactsTitle: {
      ...Typography.heading,
      color: colors.foreground,
    },
    funFact: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
  });
