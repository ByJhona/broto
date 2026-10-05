import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingCreateButton } from '../FloatingCreateButton';
import { IconButton } from '../IconButton';
import { makeStyles } from './styles';

type MapActionButtonsProps = {
  visible: boolean;
  onCreate: () => void;
  onLocate: () => void;
};

export function MapActionButtons({ visible, onCreate, onLocate }: Readonly<MapActionButtonsProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const createBottom = insets.bottom + Metrics.spacing.lg;

  return (
    <>
      {visible ? (
        <IconButton
          accessibilityLabel={t('a11yLocateMe')}
          size={Metrics.size.lg}
          elevated
          style={[styles.locateButton, { bottom: createBottom + Metrics.size.xl + Metrics.spacing.md }]}
          onPress={onLocate}
        >
          <LocateFixed size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconButton>
      ) : null}
      <FloatingCreateButton
        visible={visible}
        accessibilityLabel={t('a11yCreateListingOrEvent')}
        onPress={onCreate}
        style={{ bottom: createBottom }}
      />
    </>
  );
}
