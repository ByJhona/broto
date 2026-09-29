import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Sparkles from 'lucide-react-native/icons/sparkles';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { CardGroup, EmptyState, FloatingScreenControls, InfoSection, PageTitle, PhotoBadge, PhotoPager } from '@/components';
import type { DiagnosisHealthStatus, DiagnosisSeverity, PlantDiagnosis, PlantDiagnosisIssue } from '@/types';
import { useTranslation } from '@/i18n';
import { formatShortDate, healthStatusColor } from '@/utils';

type Translate = (key: string, options?: Record<string, unknown>) => string;
type StatusMeta = { label: string; color: string; icon: LucideIcon };

const SEVERITY_LABEL_KEYS: Record<DiagnosisSeverity, string> = {
  low: 'severityLow',
  medium: 'severityMedium',
  high: 'severityHigh',
};

function getHealthStatusMeta(colors: ThemeColors, t: Translate): Record<DiagnosisHealthStatus, StatusMeta> {
  const color = healthStatusColor(colors);
  return {
    healthy: { label: t('healthyStatusLabel'), color: color.healthy, icon: CheckCircle2 },
    attention: { label: t('attentionStatusLabel'), color: color.attention, icon: AlertTriangle },
    urgent: { label: t('urgentStatusLabel'), color: color.urgent, icon: AlertTriangle },
  };
}

function severityColor(severity: DiagnosisSeverity, colors: ThemeColors): string {
  if (severity === 'high') return colors.destructive;
  if (severity === 'medium') return colors.primary;
  return colors.leaf;
}

function parseDiagnosis(raw: string | string[] | undefined): PlantDiagnosis | null {
  if (!raw || Array.isArray(raw)) return null;
  try {
    return JSON.parse(raw) as PlantDiagnosis;
  } catch {
    return null;
  }
}

type IssueRowProps = {
  issue: PlantDiagnosisIssue;
};

function IssueRow({ issue }: Readonly<IssueRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('diagnose');
  const tone = severityColor(issue.severity, colors);

  return (
    <View style={styles.issue}>
      <View style={styles.issueHeader}>
        <Text style={styles.issueTitle}>{issue.title}</Text>
        <View style={[styles.severity, { backgroundColor: `${tone}1A` }]}>
          <Text style={[styles.severityText, { color: tone }]}>{t(SEVERITY_LABEL_KEYS[issue.severity])}</Text>
        </View>
      </View>
      <Text style={styles.issueDescription}>{issue.description}</Text>
    </View>
  );
}

function NextSteps({ actions }: Readonly<{ actions: string[] }>) {
  const styles = useThemedStyles(makeStyles);
  const steps = actions.map((action, index) => ({ action, number: index + 1 }));

  return (
    <View style={styles.steps}>
      {steps.map(({ action, number }) => (
        <View key={action} style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{number}</Text>
          </View>
          <Text style={styles.stepText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DiagnosisResultScreen() {
  const params = useLocalSearchParams<{ diagnosis: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('diagnose');
  const healthStatusMeta = useMemo(() => getHealthStatusMeta(colors, t), [colors, t]);
  const diagnosis = parseDiagnosis(params.diagnosis);

  if (!diagnosis) {
    return (
      <View style={[styles.container, styles.empty]}>
        <EmptyState icon={Sparkles} message={t('notFoundMessage')} />
        <FloatingScreenControls />
      </View>
    );
  }

  const meta = healthStatusMeta[diagnosis.healthStatus];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
        <PhotoPager
          photoUrls={[diagnosis.photoUrl]}
          placeholderIcon={Sparkles}
          fullWidth
          recyclingKey={diagnosis.id}
          overlay={<PhotoBadge icon={meta.icon} label={meta.label} color={meta.color} />}
        />

        <View style={styles.content}>
          <Text style={styles.date}>{formatShortDate(diagnosis.createdAt)}</Text>
          <PageTitle style={styles.title}>{meta.label}</PageTitle>
          <Text style={styles.summary}>{diagnosis.summary}</Text>

          {diagnosis.issues.length > 0 ? (
            <InfoSection title={t('issuesSectionTitle')}>
              <CardGroup>
                {diagnosis.issues.map((issue) => (
                  <IssueRow key={issue.title} issue={issue} />
                ))}
              </CardGroup>
            </InfoSection>
          ) : null}

          {diagnosis.recommendedActions.length > 0 ? (
            <InfoSection title={t('nextStepsSectionTitle')}>
              <NextSteps actions={diagnosis.recommendedActions} />
            </InfoSection>
          ) : null}
        </View>
      </ScrollView>

      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    empty: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Metrics.spacing.xl,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    date: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    title: {
      ...Typography.display,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    summary: {
      ...Typography.body,
      color: colors.foreground,
      marginTop: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.xl,
    },
    issue: {
      paddingVertical: Metrics.spacing.md,
      gap: Metrics.spacing.xs,
    },
    issueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    issueTitle: {
      flex: 1,
      ...Typography.heading,
      color: colors.foreground,
    },
    severity: {
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    severityText: {
      ...Typography.captionStrong,
    },
    issueDescription: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    steps: {
      gap: Metrics.spacing.md,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
    },
    stepNumber: {
      width: Metrics.size.xs,
      height: Metrics.size.xs,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.leaf,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      ...Typography.labelStrong,
      color: colors.leafForeground,
    },
    stepText: {
      flex: 1,
      ...Typography.body,
      color: colors.foreground,
    },
  });
