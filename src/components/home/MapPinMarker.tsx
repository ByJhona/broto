import { memo, useState } from 'react';
import { Marker } from 'react-native-maps';
import { Metrics } from '@/theme';
import { ListingMarkerPin } from '../ListingMarkerPin';
import { pinAppearance, type SelectedPin } from './mapPins';

const PIN_ANCHOR = { x: 0.5, y: 1 };

type MapPinMarkerProps = {
  pin: SelectedPin;
  isSelected: boolean;
  onSelect: (pin: SelectedPin) => void;
};

export const MapPinMarker = memo(function MapPinMarker({ pin, isSelected, onSelect }: Readonly<MapPinMarkerProps>) {
  const appearance = pinAppearance(pin);
  const renderKey = appearance.photoUrl ?? appearance.key;
  const [renderedKey, setRenderedKey] = useState<string | null>(null);

  return (
    <Marker
      identifier={appearance.key}
      coordinate={appearance.coordinate}
      anchor={PIN_ANCHOR}
      zIndex={isSelected ? Metrics.zIndex.raised : 0}
      tracksViewChanges={renderedKey !== renderKey}
      onPress={() => onSelect(pin)}
    >
      <ListingMarkerPin
        key={renderKey}
        color={appearance.color}
        icon={appearance.icon}
        size={Metrics.size.lg}
        photoUrl={appearance.photoUrl}
        onReady={() => setRenderedKey(renderKey)}
      />
    </Marker>
  );
});
