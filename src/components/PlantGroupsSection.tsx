import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { usePersistedCollapse } from '@/hooks';
import type { PlantGroup } from '@/types';
import { Card } from './Card';
import { CollapsibleSection } from './CollapsibleSection';
import { PlantGroupCard } from './PlantGroupCard';

const GROUPS_COLLAPSED_KEY = 'broto:garden-groups-collapsed';

function groupsSectionTitle(count: number): string {
  return count > 0 ? `Grupos (${count})` : 'Grupos';
}

type PlantGroupsSectionProps = {
  groups: PlantGroup[];
  onCreateGroup: () => void;
};

export function PlantGroupsSection({ groups, onCreateGroup }: Readonly<PlantGroupsSectionProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isCollapsed, toggleCollapsed } = usePersistedCollapse(GROUPS_COLLAPSED_KEY);

  return (
    <Card style={styles.section}>
      <CollapsibleSection
        title={groupsSectionTitle(groups.length)}
        style={styles.collapsibleSection}
        headerAction={
          <Pressable style={styles.addButton} onPress={onCreateGroup} hitSlop={8}>
            <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        }
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum grupo ainda. Toque no + pra organizar suas plantas.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {groups.map((group) => (
              <PlantGroupCard key={group.id} group={group} />
            ))}
          </ScrollView>
        )}
      </CollapsibleSection>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    collapsibleSection: {
      marginBottom: 0,
    },
    addButton: {
      width: 28,
      height: 28,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.sm,
    },
  });
