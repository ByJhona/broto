import { Fonts } from './fonts';
import { Metrics } from './metrics';

type TextSize = keyof typeof Metrics.fontSize;

function displayText<W extends '600' | '700'>(size: TextSize, fontWeight: W) {
  return {
    fontFamily: Fonts.display,
    fontSize: Metrics.fontSize[size],
    lineHeight: Metrics.lineHeight[size],
    fontWeight,
  };
}

function bodyText(size: TextSize) {
  return {
    fontFamily: Fonts.body,
    fontSize: Metrics.fontSize[size],
    lineHeight: Metrics.lineHeight[size],
  };
}

export const Typography = {
  hero: displayText('hero', '700'),
  display: displayText('display', '700'),
  headline: displayText('headline', '700'),
  title: displayText('title', '700'),
  heading: displayText('body', '700'),
  headingMedium: displayText('body', '600'),
  label: displayText('small', '600'),
  labelStrong: displayText('small', '700'),
  captionLabel: displayText('caption', '600'),
  captionStrong: displayText('caption', '700'),
  body: bodyText('body'),
  bodySmall: bodyText('small'),
  caption: bodyText('caption'),
  input: { fontFamily: Fonts.body, fontSize: Metrics.fontSize.body },
  inputSmall: { fontFamily: Fonts.body, fontSize: Metrics.fontSize.small },
} as const;
