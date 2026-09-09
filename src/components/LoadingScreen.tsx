import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, type ActivityIndicatorProps } from 'react-native';
import { useColors, type ThemeColors } from '@/theme';

type LoadingScreenProps = {
  size?: ActivityIndicatorProps['size'];
};

export function LoadingScreen({ size }: Readonly<LoadingScreenProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size={size} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
