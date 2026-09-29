import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Metrics, Overlays, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconBadge } from './IconBadge';

type AddPhotoPageProps = {
  hint: string;
  onPress: () => void;
  isUploading?: boolean;
};

export function AddPhotoPage({ hint, onPress, isUploading = false }: Readonly<AddPhotoPageProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  return (
    <Pressable
      style={styles.addPage}
      onPress={onPress}
      disabled={isUploading}
      accessibilityRole="button"
      accessibilityLabel={t('addPhoto')}
    >
      {isUploading ? (
        <ActivityIndicator color={colors.leaf} />
      ) : (
        <>
          <ImagePlus size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.addTitle}>{t('addPhoto')}</Text>
          <Text style={styles.addHint}>{hint}</Text>
        </>
      )}
    </Pressable>
  );
}

export function RemovePhotoButton({ onPress }: Readonly<{ onPress: () => void }>) {
  const colors = useColors();
  const { t } = useTranslation('common');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('a11yDeletePhoto')} onPress={onPress} hitSlop={8}>
      <IconBadge backgroundColor={Overlays.scrimMedium} size={Metrics.size.md}>
        <Trash2 size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </IconBadge>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    addPage: {
      flex: 1,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      paddingHorizontal: Metrics.spacing.xl,
    },
    addTitle: {
      ...Typography.heading,
      color: colors.foreground,
      marginTop: Metrics.spacing.sm,
    },
    addHint: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
