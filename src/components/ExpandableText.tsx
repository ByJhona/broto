import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { Metrics, type ThemeColors, Typography, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';

type ExpandableTextProps = {
  text: string;
  numberOfLines: number;
  style?: StyleProp<TextStyle>;
};

export function ExpandableText({ text, numberOfLines, style }: Readonly<ExpandableTextProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  return (
    <View>
      <Text style={style} numberOfLines={isExpanded ? undefined : numberOfLines}>
        {text}
      </Text>
      <Text
        style={[style, styles.measure]}
        onTextLayout={(event) => setIsTruncated(event.nativeEvent.lines.length > numberOfLines)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>
      {isTruncated ? (
        <Pressable onPress={() => setIsExpanded((current) => !current)} hitSlop={Metrics.spacing.sm} accessibilityRole="button">
          <Text style={styles.toggle}>{isExpanded ? t('seeLess') : t('seeMore')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    measure: {
      position: 'absolute',
      left: 0,
      right: 0,
      opacity: 0,
    },
    toggle: {
      ...Typography.label,
      color: colors.leaf,
      marginTop: Metrics.spacing.xs,
    },
  });
