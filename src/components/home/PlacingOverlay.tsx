import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconButton } from '../IconButton';
import { ListingMarkerPin } from '../ListingMarkerPin';
import { SubmitButton } from '../SubmitButton';
import { resolveDraftColor, resolveDraftIcon, resolvePlacingKind, type PlacingParams } from './placement';
import { makeStyles } from './styles';

type PlacingOverlayProps = {
  params: PlacingParams;
  isPublishing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PlacingOverlay({ params, isPublishing, onConfirm, onCancel }: Readonly<PlacingOverlayProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('home');
  const placingKind = resolvePlacingKind(params);
  const isEvent = placingKind === 'event';
  const draftIcon = resolveDraftIcon(placingKind, params.listingType);
  const draftColor = resolveDraftColor(placingKind, params.listingType, colors.primary);

  return (
    <>
      <View pointerEvents="none" style={styles.placingPin}>
        {draftIcon ? <ListingMarkerPin color={draftColor} icon={draftIcon} size={Metrics.size.lg} /> : null}
      </View>

      <View style={[styles.placingPanel, { bottom: insets.bottom + Metrics.spacing.lg }]}>
        <Text style={styles.placingText}>{isEvent ? t('placingEventInstructions') : t('placingListingInstructions')}</Text>
        <SubmitButton
          label={isEvent ? t('publishEventHere') : t('publishListingHere')}
          onPress={onConfirm}
          loading={isPublishing}
        />
      </View>

      <IconButton
        accessibilityLabel={t('common:cancel')}
        size={Metrics.size.md}
        elevated
        style={[styles.cancelButton, { top: insets.top + Metrics.spacing.sm }]}
        onPress={onCancel}
      >
        <X size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
      </IconButton>
    </>
  );
}
