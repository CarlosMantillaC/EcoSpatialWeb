import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { BASE_COORDINATE, BASE_ZOOM, useMapStore } from '../../store/map';

export function MapControlBridge() {
  const map = useMap();
  const setControls = useMapStore((state) => state.setControls);

  useEffect(() => {
    setControls({
      center: () => map.flyTo([BASE_COORDINATE.lat, BASE_COORDINATE.lng], BASE_ZOOM),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
    });
    return () => setControls(null);
  }, [map, setControls]);

  return null;
}
