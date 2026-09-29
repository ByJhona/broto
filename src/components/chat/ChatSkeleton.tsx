import { StyleSheet, View, type DimensionValue } from 'react-native';
import { Metrics } from '@/theme';
import { SkeletonBlock } from '../Skeleton';

const SKELETON_BUBBLES: { key: string; isMine: boolean; width: DimensionValue }[] = [
  { key: 'a', isMine: false, width: '55%' },
  { key: 'b', isMine: false, width: '40%' },
  { key: 'c', isMine: true, width: '60%' },
  { key: 'd', isMine: false, width: '45%' },
  { key: 'e', isMine: true, width: '35%' },
  { key: 'f', isMine: true, width: '50%' },
];

export function ChatSkeleton() {
  return (
    <View style={styles.container}>
      {SKELETON_BUBBLES.map((bubble) => (
        <SkeletonBlock
          key={bubble.key}
          width={bubble.width}
          height={Metrics.size.md}
          radius={Metrics.radius.lg}
          style={bubble.isMine ? styles.mine : styles.theirs}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...Metrics.layout.centeredContent,
    flex: 1,
    justifyContent: 'flex-end',
    gap: Metrics.spacing.sm,
    padding: Metrics.spacing.lg,
  },
  mine: {
    alignSelf: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
  },
});
