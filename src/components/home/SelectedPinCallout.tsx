import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import X from 'lucide-react-native/icons/x';
import MapPin from 'lucide-react-native/icons/map-pin';
import { Metrics, type ThemeColors, useColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatDistanceTo } from '@/utils';
import { Card } from '../Card';
import { InfoChip } from '../InfoChip';
import { IconButton } from '../IconButton';
import { PhotoBadge } from '../PhotoCard';
import type { SelectedPin } from './mapPins';
import { pinModel } from './pinModel';
import type { Coordinates } from './useHomeLocation';

type SelectedPinCalloutProps = {
  pin: SelectedPin;
  userLocation: Coordinates | null;
  onClose: () => void;
};

export function SelectedPinCallout({ pin, userLocation, onClose }: Readonly<SelectedPinCalloutProps>) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['home', 'event', 'common']);
  const model = pinModel(pin, t);
  const Icon = model.icon;
  const openDetail = () => router.push(model.href);
  const bottomOffset = insets.bottom + Metrics.spacing.md;

  return (
    <Card
      style={[styles.card, { bottom: bottomOffset }]}
      onPress={openDetail}
    >
      <View style={[styles.photo, { backgroundColor: `${model.color}1F` }]}>
        {model.photoUrl ? (
          <Image source={{ uri: model.photoUrl }} style={styles.photoImage} contentFit="cover" transition={200} />
        ) : (
          <Icon size={Metrics.icon.xl} color={model.color} strokeWidth={Metrics.icon.stroke.regular} />
        )}
        <View style={styles.badge}>
          <PhotoBadge icon={Icon} label={model.badgeLabel} color={model.color} />
        </View>
        <IconButton accessibilityLabel={t('common:close')} size={Metrics.size.sm} elevated style={styles.close} onPress={onClose}>
          <X size={Metrics.icon.small} color={colors.foreground} strokeWidth={Metrics.icon.stroke.regular} />
        </IconButton>
      </View>
      <View style={styles.body}>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {model.title}
            </Text>
            <InfoChip size="sm" icon={MapPin} value={formatDistanceTo(userLocation, model.coordinate.latitude, model.coordinate.longitude)} />
          </View>
          {model.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {model.subtitle}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      position: 'absolute',
      left: Metrics.spacing.lg,
      right: Metrics.spacing.lg,
      padding: 0,
      overflow: 'hidden',
    },
    photo: {
      height: Metrics.media.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    badge: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      left: Metrics.spacing.sm,
    },
    close: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      right: Metrics.spacing.sm,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.md,
    },
    info: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    title: {
      flex: 1,
      ...Typography.heading,
      color: colors.foreground,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
