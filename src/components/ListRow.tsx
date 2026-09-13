import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type ListRowProps = {
  leading?: ReactNode;
  eyebrow?: string;
  title: string;
  titleColor?: string;
  titleTrailing?: ReactNode;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  variant?: 'plain' | 'card';
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  leading,
  eyebrow,
  title,
  titleColor,
  titleTrailing,
  subtitle,
  trailing,
  onPress,
  variant = 'plain',
  style,
}: Readonly<ListRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const content = (
    <View style={[styles.row, variant === 'card' && styles.rowCard]}>
      {leading}
      <View style={styles.body}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <View style={styles.titleLine}>
          <Text style={[styles.title, titleColor ? { color: titleColor } : null]} numberOfLines={1}>
            {title}
          </Text>
          {titleTrailing}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable style={style} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    rowCard: {
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Metrics.spacing.md,
    },
    body: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.leaf,
      textTransform: 'uppercase',
    },
    titleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });
