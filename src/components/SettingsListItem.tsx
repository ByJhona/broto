import { StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors } from '@/theme';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';

type SettingsListItemProps = {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  destructive?: boolean;
  onPress: () => void;
};

export function SettingsListItem({ icon: Icon, label, subtitle, destructive = false, onPress }: Readonly<SettingsListItemProps>) {
  const colors = useColors();
  const tint = destructive ? colors.destructive : colors.leaf;

  return (
    <ListRow
      leading={
        <IconBadge backgroundColor={`${tint}1F`}>
          <Icon size={Metrics.icon.small} color={tint} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
      }
      title={label}
      titleColor={destructive ? colors.destructive : undefined}
      subtitle={subtitle}
      trailing={
        destructive ? undefined : (
          <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
        )
      }
      onPress={onPress}
      style={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Metrics.spacing.md,
  },
});
