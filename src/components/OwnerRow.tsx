import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Avatar } from './Avatar';
import { ListRow } from './ListRow';

type OwnerRowProps = {
  eyebrow: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  onPress: () => void;
};

export function OwnerRow({ eyebrow, ownerName, ownerAvatarUrl, onPress }: Readonly<OwnerRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!ownerName) return null;

  return (
    <>
      <ListRow
        leading={<Avatar name={ownerName} url={ownerAvatarUrl} size={48} />}
        eyebrow={eyebrow}
        title={ownerName}
        trailing={<ChevronRight size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
        onPress={onPress}
      />
      <View style={styles.divider} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: Metrics.spacing.md,
    },
  });
