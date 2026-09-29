import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantCommonProblem } from '@/types';
import { CardGroup } from '../CardGroup';
import { InfoSection } from '../InfoSection';

type ProblemItemProps = {
  problem: PlantCommonProblem;
  isExpanded: boolean;
  onToggle: () => void;
};

function ProblemItem({ problem, isExpanded, onToggle }: Readonly<ProblemItemProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  return (
    <View>
      <Pressable
        style={styles.itemHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.symptom}>{problem.symptom}</Text>
        <ChevronDown
          size={Metrics.icon.small}
          color={colors.mutedForeground}
          strokeWidth={Metrics.icon.strokeWidth}
          style={isExpanded ? styles.chevronOpen : undefined}
        />
      </Pressable>
      {isExpanded ? (
        <View style={styles.itemBody}>
          <Text style={styles.fieldLabel}>{t('problemCause')}</Text>
          <Text style={styles.fieldText}>{problem.cause}</Text>
          <Text style={[styles.fieldLabel, styles.fieldGap]}>{t('problemSolution')}</Text>
          <Text style={styles.fieldText}>{problem.solution}</Text>
        </View>
      ) : null}
    </View>
  );
}

type CommonProblemsSectionProps = {
  problems: PlantCommonProblem[];
  action?: ReactNode;
};

export function CommonProblemsSection({ problems, action }: Readonly<CommonProblemsSectionProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  if (problems.length === 0) return null;

  const toggle = (symptom: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(symptom)) next.delete(symptom);
      else next.add(symptom);
      return next;
    });
  };

  return (
    <InfoSection title={t('problemsTitle')}>
      <CardGroup>
        {problems.map((problem) => (
          <ProblemItem
            key={problem.symptom}
            problem={problem}
            isExpanded={expanded.has(problem.symptom)}
            onToggle={() => toggle(problem.symptom)}
          />
        ))}
      </CardGroup>
      {action ? <View style={styles.action}>{action}</View> : null}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      paddingVertical: Metrics.spacing.md,
    },
    symptom: {
      flex: 1,
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    chevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    itemBody: {
      paddingBottom: Metrics.spacing.md,
    },
    fieldLabel: {
      ...Typography.captionLabel,
      color: colors.leaf,
    },
    fieldGap: {
      marginTop: Metrics.spacing.sm,
    },
    fieldText: {
      ...Typography.bodySmall,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    action: {
      marginTop: Metrics.spacing.md,
    },
  });
