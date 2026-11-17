import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { geocodeApi } from '../../lib/api';
import { useFleetStore } from '../../store/fleet';
import { BASE_COORDINATE, BASE_ZOOM } from '../../store/map';
import { useOpsStore } from '../../store/ops';
import { MapControlBridge } from './MapControlBridge';
import { RouteLayer } from './RouteLayer';
import { TrafficLayer } from './TrafficLayer';
import { VehicleMarkers } from './VehicleMarkers';

function DispatchClickHandler() {
  const selectDestination = useFleetStore(
    (state) => state.selectDestination,
  );
  const loading = useFleetStore((state) => state.loading);
  const pickingOnMap = useOpsStore((state) => state.pickingOnMap);
  const setPickedPoint = useOpsStore((state) => state.setPickedPoint);

  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      // Modo "Elegir en el mapa" del formulario de ordenes: el clic llena
      // el formulario (y de paso nombra el destino por geocodificacion).
      if (pickingOnMap) {
        void geocodeApi
          .reverse(lat, lng)
          .then((result) =>
            setPickedPoint({ lat, lng, label: result.label ?? undefined }),
          )
          .catch(() => setPickedPoint({ lat, lng }));
        return;
      }
      if (loading) return;
      void selectDestination(lat, lng);
    },
  });

  return null;
}

/** Destino provisional elegido para una orden (se ve mientras dura la eleccion). */
function PickedPointMarker() {
  const pickedPoint = useOpsStore((state) => state.pickedPoint);
  if (!pickedPoint) return null;
  return (
    <CircleMarker
      center={[pickedPoint.lat, pickedPoint.lng]}
      radius={10}
      pathOptions={{
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.5,
        weight: 3,
      }}
    />
  );
}

export function MapView() {
  const pickingOnMap = useOpsStore((state) => state.pickingOnMap);

  return (
    <div className="relative h-full w-full">
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
        <PickedPointMarker />
        <RouteLayer />
      </MapContainer>

      {pickingOnMap && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[600] -translate-x-1/2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
          Haz clic en el mapa para elegir el destino de la orden
        </div>
      )}
    </div>
  );
}
