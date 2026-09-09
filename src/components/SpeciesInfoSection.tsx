import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Bug from 'lucide-react-native/icons/bug';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Droplet from 'lucide-react-native/icons/droplet';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { PlantCommonProblem, SpeciesInfoDisplay } from '@/types';
import { SkeletonBlock } from './Skeleton';
import { ExpandableCard } from './ExpandableCard';

type SpeciesInfoSectionProps = {
  info: SpeciesInfoDisplay;
};

type AboutCardProps = {
  info: SpeciesInfoDisplay;
  isExpanded: boolean;
  onToggle: () => void;
};

function AboutCard({ info, isExpanded, onToggle }: Readonly<AboutCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.section, styles.aboutCard]}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <Text style={styles.sectionTitle}>Sobre a espécie</Text>
        {isExpanded ? (
          <ChevronUp size={16} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        ) : (
          <ChevronDown size={16} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        )}
      </Pressable>
      {isExpanded && (
        <>
          <Text style={styles.description}>{info.description}</Text>
          {info.wateringDescription ? (
            <View style={styles.wateringRow}>
              <Droplet size={16} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.wateringText}>{info.wateringDescription}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function ToxicityCard({ info }: Readonly<{ info: SpeciesInfoDisplay }>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <ExpandableCard
        title="Atenção: Tóxica"
        icon={<AlertTriangle size={Metrics.icon.normal} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />}
        color={colors.destructive}
        defaultExpanded={true}
      >
        <View style={styles.warningContent}>
          {info.toxicToPets ? (
            <View style={styles.listRow}>
              <View style={[styles.bullet, { backgroundColor: colors.destructive }]} />
              <Text style={styles.listText}>
                Para pets{info.toxicToPetsNotes ? `: ${info.toxicToPetsNotes}` : ''}
              </Text>
            </View>
          ) : null}
          {info.toxicToHumans ? (
            <View style={styles.listRow}>
              <View style={[styles.bullet, { backgroundColor: colors.destructive }]} />
              <Text style={styles.listText}>
                Para humanos{info.toxicToHumansNotes ? `: ${info.toxicToHumansNotes}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </ExpandableCard>
    </View>
  );
}

function FunFactsCard({ funFacts }: Readonly<{ funFacts: string[] }>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <ExpandableCard
        title="Você sabia?"
        icon={<Lightbulb size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />}
        color={colors.leaf}
        defaultExpanded={true}
      >
        {funFacts.map((fact) => (
          <View key={fact} style={styles.listRow}>
            <View style={styles.bullet} />
            <Text style={styles.listText}>{fact}</Text>
          </View>
        ))}
      </ExpandableCard>
    </View>
  );
}

function CommonProblemsCard({ commonProblems }: Readonly<{ commonProblems: PlantCommonProblem[] }>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <ExpandableCard
        title="Problemas comuns"
        icon={<Bug size={Metrics.icon.normal} color={colors.secondary} strokeWidth={Metrics.icon.strokeWidth} />}
        color={colors.secondary}
      >
        {commonProblems.map((problem) => (
          <View key={problem.issue} style={styles.problemRow}>
            <Text style={styles.problemIssue}>{problem.issue}</Text>
            <Text style={styles.problemCause}>{problem.likelyCause}</Text>
          </View>
        ))}
      </ExpandableCard>
    </View>
  );
}

export function SpeciesInfoSection({ info }: Readonly<SpeciesInfoSectionProps>) {
  const [isAboutExpanded, setIsAboutExpanded] = useState(true);

  return (
    <View>
      <AboutCard info={info} isExpanded={isAboutExpanded} onToggle={() => setIsAboutExpanded((current) => !current)} />
      {(info.toxicToPets || info.toxicToHumans) && <ToxicityCard info={info} />}
      {info.funFacts.length > 0 && <FunFactsCard funFacts={info.funFacts} />}
      {info.commonProblems.length > 0 && <CommonProblemsCard commonProblems={info.commonProblems} />}
    </View>
  );
}

export function SpeciesInfoSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <View style={[styles.section, styles.aboutCard]}>
        <SkeletonBlock width={110} height={12} style={styles.skeletonGap} />
        <SkeletonBlock height={15} style={styles.skeletonGap} />
        <SkeletonBlock height={15} style={styles.skeletonGap} />
        <SkeletonBlock width="70%" height={15} style={styles.skeletonGapLg} />
        <View style={styles.chipRow}>
          <SkeletonBlock width={120} height={26} radius={Metrics.radius.full} />
          <SkeletonBlock width={140} height={26} radius={Metrics.radius.full} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.factsCard}>
          <View style={styles.factsHeader}>
            <SkeletonBlock width={Metrics.icon.normal} height={Metrics.icon.normal} radius={Metrics.radius.sm} />
            <SkeletonBlock width={100} height={15} />
          </View>
          <SkeletonBlock height={14} style={styles.skeletonGap} />
          <SkeletonBlock height={14} style={styles.skeletonGap} />
          <SkeletonBlock width="60%" height={14} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.factsCard}>
          <View style={styles.factsHeader}>
            <SkeletonBlock width={Metrics.icon.normal} height={Metrics.icon.normal} radius={Metrics.radius.sm} />
            <SkeletonBlock width={130} height={15} />
          </View>
          <SkeletonBlock width="50%" height={14} style={styles.skeletonGap} />
          <SkeletonBlock height={14} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  warningContent: {
    gap: Metrics.spacing.sm,
  },
  section: {
    marginBottom: Metrics.spacing.lg,
  },
  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Metrics.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: Metrics.spacing.sm,
  },
  wateringRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.xs,
    paddingTop: Metrics.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  wateringText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.leaf,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: colors.foreground,
  },
  skeletonGap: {
    marginBottom: Metrics.spacing.xs,
  },
  skeletonGapLg: {
    marginBottom: Metrics.spacing.sm,
  },
  factsCard: {
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: Metrics.spacing.md,
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  problemRow: {
    marginBottom: Metrics.spacing.sm,
  },
  problemIssue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  problemCause: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
    marginTop: 2,
  },
  });
