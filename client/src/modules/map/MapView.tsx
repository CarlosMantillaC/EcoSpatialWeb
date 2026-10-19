import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';
import { BASE_COORDINATE, BASE_ZOOM } from '../../store/map';
import { MapControlBridge } from './MapControlBridge';
import { RouteLayer } from './RouteLayer';
import { TrafficLayer } from './TrafficLayer';
import { VehicleMarkers } from './VehicleMarkers';

function DispatchClickHandler() {
  const createDispatch = useFleetStore((state) => state.createDispatch);
  const loading = useFleetStore((state) => state.loading);

  useMapEvents({
    click(event) {
      if (loading) return;
      void createDispatch(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function MapView() {
  return (
    <MapContainer
      center={[BASE_COORDINATE.lat, BASE_COORDINATE.lng]}
      zoom={BASE_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapControlBridge />
      <DispatchClickHandler />
      <TrafficLayer />
      <VehicleMarkers />
      <RouteLayer />
    </MapContainer>
  );
}
