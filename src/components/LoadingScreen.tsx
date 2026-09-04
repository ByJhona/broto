import { ActivityIndicator, StyleSheet, View, type ActivityIndicatorProps } from 'react-native';
import { Colors } from '@/theme';

type LoadingScreenProps = {
  size?: ActivityIndicatorProps['size'];
};

export function LoadingScreen({ size }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
