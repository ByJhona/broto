import Supercluster from 'supercluster';
import type { Region } from 'react-native-maps';
import { pinAppearance, type SelectedPin } from './mapPins';

const CLUSTER_RADIUS = 60;
const CLUSTER_MAX_ZOOM = 16;
const TILE_SIZE = 256;
const VIEWPORT_MARGIN = 0.25;

type PinProperties = { pin: SelectedPin };

export type ClusterIndex = Supercluster<PinProperties>;

export type MapCluster = {
  id: number;
  count: number;
  coordinate: { latitude: number; longitude: number };
};

export type MapItems = {
  clusters: MapCluster[];
  pins: SelectedPin[];
};

export function buildClusterIndex(pins: SelectedPin[]): ClusterIndex {
  const index = new Supercluster<PinProperties>({ radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM });
  index.load(
    pins.map((pin) => {
      const { latitude, longitude } = pinAppearance(pin).coordinate;
      return { type: 'Feature', properties: { pin }, geometry: { type: 'Point', coordinates: [longitude, latitude] } };
    })
  );
  return index;
}

export function regionZoom(region: Region, mapWidth: number): number {
  return Math.log2((360 * mapWidth) / (TILE_SIZE * region.longitudeDelta));
}

export function regionBounds(region: Region): [number, number, number, number] {
  const lngMargin = region.longitudeDelta * (0.5 + VIEWPORT_MARGIN);
  const latMargin = region.latitudeDelta * (0.5 + VIEWPORT_MARGIN);
  return [
    Math.max(-180, region.longitude - lngMargin),
    Math.max(-85, region.latitude - latMargin),
    Math.min(180, region.longitude + lngMargin),
    Math.min(85, region.latitude + latMargin),
  ];
}

export function visibleMapItems(index: ClusterIndex, region: Region, mapWidth: number): MapItems {
  const items: MapItems = { clusters: [], pins: [] };
  for (const feature of index.getClusters(regionBounds(region), Math.round(regionZoom(region, mapWidth)))) {
    const [longitude, latitude] = feature.geometry.coordinates;
    if ('cluster' in feature.properties) {
      items.clusters.push({ id: feature.properties.cluster_id, count: feature.properties.point_count, coordinate: { latitude, longitude } });
    } else {
      items.pins.push(feature.properties.pin);
    }
  }
  return items;
}
