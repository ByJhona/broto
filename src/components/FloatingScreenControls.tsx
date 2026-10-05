import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton } from './IconButton';

type FloatingScreenControlsProps = {
  onOpenActions?: () => void;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  showBack?: boolean;
  isBusy?: boolean;
};

export function FloatingScreenControls({
  onOpenActions,
  actionIcon: ActionIcon = EllipsisVertical,
  actionLabel,
  showBack = true,
  isBusy = false,
}: Readonly<FloatingScreenControlsProps>) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');

  return (
    <View style={[styles.bar, { top: insets.top + Metrics.spacing.sm }]} pointerEvents="box-none">
      {showBack ? (
        <IconButton accessibilityLabel={t('a11yBack')} size={Metrics.size.md} elevated onPress={() => router.back()}>
          <ArrowLeft size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.stroke.regular} />
        </IconButton>
      ) : (
        <View />
      )}
      {onOpenActions ? (
        <IconButton
          accessibilityLabel={actionLabel ?? t('a11yMoreOptions')}
          size={Metrics.size.md}
          elevated
          disabled={isBusy}
          onPress={onOpenActions}
        >
          <ActionIcon size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.stroke.regular} />
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Metrics.spacing.md,
    right: Metrics.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
