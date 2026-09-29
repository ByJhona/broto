import { Children, isValidElement, type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';

type CardGroupProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function CardGroup({ children, style }: Readonly<CardGroupProps>) {
  const styles = useThemedStyles(makeStyles);
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.group, style]}>
      {items.map((item, index) => (
        <View key={item.key} style={index < items.length - 1 ? styles.divider : undefined}>
          {item}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Metrics.spacing.md,
      overflow: 'hidden',
    },
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
  });
