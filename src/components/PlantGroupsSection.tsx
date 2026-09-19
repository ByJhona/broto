import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { useMultiSelect, usePersistedCollapse } from '@/hooks';
import { confirmAndDeleteMany } from '@/utils';
import type { PlantGroup } from '@/types';
import { Card } from './Card';
import { CollapsibleSection } from './CollapsibleSection';
import { MultiSelectHeaderActions } from './MultiSelectHeaderActions';
import { PlantGroupCard } from './PlantGroupCard';

const GROUPS_COLLAPSED_KEY = 'broto:garden-groups-collapsed';

function groupsSectionTitle(count: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return count > 0 ? t('groupsTitleWithCount', { count }) : t('groupsTitle');
}

type PlantGroupsSectionProps = {
  groups: PlantGroup[];
  onCreateGroup: () => void;
  onDeleteGroup: (id: string) => void;
};

export function PlantGroupsSection({ groups, onCreateGroup, onDeleteGroup }: Readonly<PlantGroupsSectionProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['garden', 'group']);
  const { isCollapsed, toggleCollapsed } = usePersistedCollapse(GROUPS_COLLAPSED_KEY);
  const selection = useMultiSelect();

  const handleConfirmDelete = async () => {
    const selectedGroups = groups.filter((group) => selection.selectedIds.includes(group.id));
    const totalPlants = selectedGroups.reduce((sum, group) => sum + group.plantCount, 0);

    const title =
      selection.selectedIds.length === 1
        ? t('group:deleteGroupTitle')
        : t('group:deleteGroupsConfirmTitleMany', { count: selection.selectedIds.length });
    const message =
      selection.selectedIds.length === 1
        ? t('group:deleteGroupMessage', { count: totalPlants })
        : t('group:deleteGroupsConfirmMessageMany', { count: totalPlants });

    const didDelete = await confirmAndDeleteMany(selection.selectedIds, onDeleteGroup, title, message, t('common:delete'));
    if (didDelete) selection.stopSelecting();
  };

  return (
    <Card style={styles.section}>
      <CollapsibleSection
        title={groupsSectionTitle(groups.length, t)}
        style={styles.collapsibleSection}
        headerAction={
          <MultiSelectHeaderActions
            isSelecting={selection.isSelecting}
            selectedCount={selection.selectedIds.length}
            selectAccessibilityLabel={t('group:selectGroupsAction')}
            onAdd={onCreateGroup}
            onStartSelecting={selection.startSelecting}
            onCancelSelecting={selection.stopSelecting}
            onConfirmDelete={handleConfirmDelete}
          />
        }
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>{t('noGroupsYet')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {groups.map((group) => (
              <PlantGroupCard
                key={group.id}
                group={group}
                onDelete={onDeleteGroup}
                isSelecting={selection.isSelecting}
                isSelected={selection.selectedIds.includes(group.id)}
                onToggleSelected={selection.toggleSelected}
              />
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
