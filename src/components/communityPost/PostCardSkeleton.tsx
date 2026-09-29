import { View } from 'react-native';
import { Metrics, useThemedStyles } from '@/theme';
import { SkeletonBlock } from '../Skeleton';
import { makeStyles } from './styles';

export function PostCardSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonBlock width={Metrics.size.md} height={Metrics.size.md} radius={Metrics.radius.full} />
        <View style={[styles.headerAuthor, styles.skeletonLines]}>
          <SkeletonBlock width="40%" />
          <SkeletonBlock width="25%" height={Metrics.fontSize.caption} />
        </View>
      </View>
      <View style={[styles.body, styles.skeletonLines]}>
        <SkeletonBlock />
        <SkeletonBlock width="85%" />
        <SkeletonBlock width="60%" />
      </View>
    </View>
  );
}
