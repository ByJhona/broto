import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors } from '@/theme';
import { Avatar } from './Avatar';
import { ListRow } from './ListRow';

type OwnerRowProps = {
  eyebrow: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function OwnerRow({ eyebrow, ownerName, ownerAvatarUrl, onPress, style }: Readonly<OwnerRowProps>) {
  const colors = useColors();

  if (!ownerName) return null;

  return (
    <ListRow
      variant="card"
      style={[styles.row, style]}
      leading={<Avatar name={ownerName} url={ownerAvatarUrl} size={Metrics.size.lg} />}
      eyebrow={eyebrow}
      title={ownerName}
      trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Metrics.spacing.xl,
  },
});
