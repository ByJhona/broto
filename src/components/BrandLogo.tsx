import Svg, { Path } from 'react-native-svg';
import { Metrics, useColors } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SPROUT_PATHS,
  BRAND_LOGO_TEXT_PATH,
  BRAND_LOGO_WIDTH,
} from './brandLogoPaths';

type BrandLogoProps = {
  height?: number;
};

export function BrandLogo({ height = Metrics.size.lg }: Readonly<BrandLogoProps>) {
  const colors = useColors();
  const { t } = useTranslation('common');
  const width = (height * BRAND_LOGO_WIDTH) / BRAND_LOGO_HEIGHT;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${BRAND_LOGO_WIDTH} ${BRAND_LOGO_HEIGHT}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('appName')}
    >
      <Path d={BRAND_LOGO_TEXT_PATH} fill={colors.foreground} />
      {BRAND_LOGO_SPROUT_PATHS.map((d) => (
        <Path key={d} d={d} fill={colors.leaf} />
      ))}
    </Svg>
  );
}
