import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { MapCluster } from './mapClusters';

const CENTER_ANCHOR = { x: 0.5, y: 0.5 };

function clusterSize(count: number): number {
  if (count >= 100) return Metrics.size.xl;
  if (count >= 10) return Metrics.size.lg;
  return Metrics.size.md;
}

type ClusterMarkerProps = {
  cluster: MapCluster;
  onPress: (cluster: MapCluster) => void;
};

export const ClusterMarker = memo(function ClusterMarker({ cluster, onPress }: Readonly<ClusterMarkerProps>) {
  const styles = useThemedStyles(makeStyles);
  const [renderedCount, setRenderedCount] = useState<number | null>(null);
  const size = clusterSize(cluster.count);

  return (
    <Marker
      coordinate={cluster.coordinate}
      anchor={CENTER_ANCHOR}
      tracksViewChanges={renderedCount !== cluster.count}
      onPress={() => onPress(cluster)}
    >
      <View
        key={cluster.count}
        style={[styles.bubble, { width: size, height: size }]}
        onLayout={() => setRenderedCount(cluster.count)}
      >
        <Text style={styles.count}>{cluster.count}</Text>
      </View>
    </Marker>
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bubble: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: Metrics.radius.full,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.leafForeground,
      backgroundColor: colors.leaf,
    },
    count: {
      ...Typography.labelStrong,
      color: colors.leafForeground,
    },
  });
