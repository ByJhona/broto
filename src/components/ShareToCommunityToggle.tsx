import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card } from './Card';

type ShareToCommunityToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  description: string;
};

export function ShareToCommunityToggle({ value, onValueChange, description }: Readonly<ShareToCommunityToggleProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Card style={styles.row} onPress={() => onValueChange(!value)}>
      <View style={styles.textBox}>
        <Text style={styles.title}>Publicar na Comunidade</Text>
        <Text style={styles.subtitle}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.white}
      />
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      marginBottom: Metrics.spacing.lg,
    },
    textBox: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });
