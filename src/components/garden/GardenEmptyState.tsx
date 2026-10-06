import { StyleSheet, View } from 'react-native';
import Folder from 'lucide-react-native/icons/folder';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState } from '../EmptyState';

type GardenEmptyStateProps = {
  isGroupSelected: boolean;
  onAddPlantsToGroup: () => void;
};

export function GardenEmptyState({ isGroupSelected, onAddPlantsToGroup }: Readonly<GardenEmptyStateProps>) {
  const { t } = useTranslation(['garden', 'group']);

  if (isGroupSelected) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={Folder}
          title={t('group:emptyGroupTitle')}
          message={t('group:emptyGroupMessage')}
          action={{ label: t('group:addPlants'), onPress: onAddPlantsToGroup }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState icon={Leaf} title={t('noPlantsYetTitle')} message={t('noPlantsYetMessage')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.lg,
  },
});
