import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import type { PlantSpeciesInfo } from '@/types';
import { SkeletonBlock } from './Skeleton';
import { ExpandableCard } from './ExpandableCard';

type SpeciesInfoSectionProps = {
  info: PlantSpeciesInfo;
};

export function SpeciesInfoSection({ info }: SpeciesInfoSectionProps) {
  const [isAboutExpanded, setIsAboutExpanded] = useState(true);

  return (
    <View>
      <View style={[styles.section, styles.aboutCard]}>
        <Pressable style={styles.sectionHeader} onPress={() => setIsAboutExpanded((current) => !current)}>
          <Text style={styles.sectionTitle}>Sobre a espécie</Text>
          {isAboutExpanded ? (
            <ChevronUp size={16} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          ) : (
            <ChevronDown size={16} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          )}
        </Pressable>
        {isAboutExpanded ? <Text style={styles.description}>{info.description}</Text> : null}
      </View>

      {info.toxicToPets || info.toxicToHumans ? (
        <View style={styles.section}>
          <ExpandableCard
            title="Atenção: Tóxica"
            icon={<AlertTriangle size={Metrics.icon.normal} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />}
            color={Colors.destructive}
            defaultExpanded={true}
          >
            <View style={styles.warningContent}>
              {info.toxicToPets ? (
                <View style={styles.listRow}>
                  <View style={[styles.bullet, { backgroundColor: Colors.destructive }]} />
                  <Text style={styles.listText}>
                    Para pets{info.toxicToPetsNotes ? `: ${info.toxicToPetsNotes}` : ''}
                  </Text>
                </View>
              ) : null}
              {info.toxicToHumans ? (
                <View style={styles.listRow}>
                  <View style={[styles.bullet, { backgroundColor: Colors.destructive }]} />
                  <Text style={styles.listText}>
                    Para humanos{info.toxicToHumansNotes ? `: ${info.toxicToHumansNotes}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </ExpandableCard>
        </View>
      ) : null}

      {info.funFacts.length > 0 ? (
        <View style={styles.section}>
          <ExpandableCard
            title="Você sabia?"
            icon={<Lightbulb size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />}
            color={Colors.leaf}
            defaultExpanded={true}
          >
            {info.funFacts.map((fact) => (
              <View key={fact} style={styles.listRow}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>{fact}</Text>
              </View>
            ))}
          </ExpandableCard>
        </View>
      ) : null}
    </View>
  );
}

export function SpeciesInfoSkeleton() {
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
    </View>
  );
}

const styles = StyleSheet.create({
  warningContent: {
    gap: Metrics.spacing.sm,
  },
  section: {
    marginBottom: Metrics.spacing.lg,
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.sm,
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
    backgroundColor: Colors.leaf,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: Colors.foreground,
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
    borderColor: Colors.border,
    backgroundColor: Colors.muted,
    padding: Metrics.spacing.md,
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
});
