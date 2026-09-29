import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatDistanceTo } from '@/utils';
import { Card } from '../Card';
import { DistancePill } from '../DistancePill';
import { PhotoBadge } from '../PhotoCard';
import { SubmitButton } from '../SubmitButton';
import type { SelectedPin } from './mapPins';
import { pinModel } from './pinModel';
import type { Coordinates } from './useHomeLocation';

type SelectedPinCalloutProps = {
  pin: SelectedPin;
  userLocation: Coordinates | null;
};

export function SelectedPinCallout({ pin, userLocation }: Readonly<SelectedPinCalloutProps>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['home', 'event']);
  const model = pinModel(pin, t);
  const Icon = model.icon;
  const openDetail = () => router.push(model.href);

  return (
    <Card style={[styles.card, { bottom: insets.bottom + Metrics.spacing.md }]} onPress={openDetail}>
      <View style={[styles.photo, { backgroundColor: `${model.color}1F` }]}>
        {model.photoUrl ? (
          <Image source={{ uri: model.photoUrl }} style={styles.photoImage} contentFit="cover" transition={200} />
        ) : (
          <Icon size={Metrics.icon.xl} color={model.color} strokeWidth={Metrics.icon.strokeWidth} />
        )}
        <View style={styles.badge}>
          <PhotoBadge icon={Icon} label={model.badgeLabel} color={model.color} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {model.title}
          </Text>
          <DistancePill label={formatDistanceTo(userLocation, model.latitude, model.longitude)} />
        </View>
        {model.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {model.subtitle}
          </Text>
        ) : null}
        <SubmitButton label={model.actionLabel} onPress={openDetail} />
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
    body: {
      gap: Metrics.spacing.xs,
      padding: Metrics.spacing.md,
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
