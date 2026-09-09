import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Sparkles from 'lucide-react-native/icons/sparkles';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { Card, EmptyState, SectionTitle } from '@/components';
import type { DiagnosisHealthStatus, DiagnosisSeverity, PlantDiagnosis } from '@/types';

const HEALTH_STATUS_META: Record<DiagnosisHealthStatus, { label: string; color: string; icon: LucideIcon }> = {
  healthy: { label: 'Sua planta está saudável', color: Colors.leaf, icon: CheckCircle2 },
  attention: { label: 'Precisa de um pouco de atenção', color: Colors.secondary, icon: AlertTriangle },
  urgent: { label: 'Precisa de cuidado urgente', color: Colors.destructive, icon: AlertTriangle },
};

const SEVERITY_COLOR: Record<DiagnosisSeverity, string> = {
  low: Colors.leaf,
  medium: Colors.secondary,
  high: Colors.destructive,
};

function parseDiagnosis(raw: string | string[] | undefined): PlantDiagnosis | null {
  if (!raw || Array.isArray(raw)) return null;
  try {
    return JSON.parse(raw) as PlantDiagnosis;
  } catch {
    return null;
  }
}

export default function DiagnosisResultScreen() {
  const params = useLocalSearchParams<{ diagnosis: string }>();
  const diagnosis = parseDiagnosis(params.diagnosis);

  if (!diagnosis) {
    return (
      <EmptyState
        icon={Sparkles}
        message="Não conseguimos identificar nenhuma planta nessa foto. Tente tirar de perto, com boa iluminação."
        style={styles.emptyContainer}
      />
    );
  }

  const meta = HEALTH_STATUS_META[diagnosis.healthStatus];
  const StatusIcon = meta.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: diagnosis.photoUrl }} style={styles.photo} contentFit="cover" />

      <View style={[styles.statusBadge, { backgroundColor: `${meta.color}1A`, borderColor: meta.color }]}>
        <StatusIcon size={Metrics.icon.normal} color={meta.color} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      <Text style={styles.summary}>{diagnosis.summary}</Text>

      {diagnosis.issues.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>O que percebemos</SectionTitle>
          {diagnosis.issues.map((issue) => (
            <Card key={issue.title} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[issue.severity] }]} />
                <Text style={styles.issueTitle}>{issue.title}</Text>
              </View>
              <Text style={styles.issueDescription}>{issue.description}</Text>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionTitle>Próximos passos</SectionTitle>
        {diagnosis.recommendedActions.map((action) => (
          <View key={action} style={styles.actionRow}>
            <CheckCircle2 size={18} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Metrics.spacing.xl,
    backgroundColor: Colors.background,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Metrics.radius.lg,
    backgroundColor: Colors.muted,
    marginBottom: Metrics.spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    borderWidth: 1,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.md,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.foreground,
    marginTop: Metrics.spacing.md,
  },
  section: {
    marginTop: Metrics.spacing.lg,
  },
  issueCard: {
    marginBottom: Metrics.spacing.sm,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: Metrics.radius.full,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  issueDescription: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
    paddingLeft: 8 + Metrics.spacing.sm,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foreground,
  },
});
