import { StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors } from '@/theme';
import { IconBadge } from '../IconBadge';
import { ListRow } from '../ListRow';

type PickerRowProps = {
  icon: LucideIcon;
  color: string;
  eyebrow: string;
  value: string;
  onPress: () => void;
};

export function PickerRow({ icon: Icon, color, eyebrow, value, onPress }: Readonly<PickerRowProps>) {
  const colors = useColors();

  return (
    <ListRow
      style={styles.row}
      leading={
        <IconBadge>
          <Icon size={Metrics.icon.small} color={color} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
      }
      eyebrow={eyebrow}
      title={value}
      trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Metrics.spacing.md,
  },
});
