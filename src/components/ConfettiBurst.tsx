import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReduceMotion } from '@/hooks';

const CONFETTI_ANIMATION = require('../../assets/animations/confetti.json');

type ConfettiBurstProps = {
  playKey: string | number;
};

export function ConfettiBurst({ playKey }: Readonly<ConfettiBurstProps>) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LottieView key={playKey} source={CONFETTI_ANIMATION} autoPlay loop={false} style={StyleSheet.absoluteFill} />
    </View>
  );
}
