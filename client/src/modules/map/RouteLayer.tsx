import L from 'leaflet';
import { useEffect } from 'react';
import { Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';

const destinationIcon = L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#ef4444;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,.4);color:#fff;font-size:16px;font-weight:700">&#9873;</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
  popupAnchor: [0, -26],
});

function FitRoute() {
  const map = useMap();
  const route = useFleetStore((state) => state.route);

  useEffect(() => {
    if (!route || route.coordinates.length === 0) return;
    const bounds = L.latLngBounds(
      route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [map, route]);

  return null;
}

export function RouteLayer() {
  const route = useFleetStore((state) => state.route);
  const destination = useFleetStore((state) => state.destination);
  const lastDispatch = useFleetStore((state) => state.lastDispatch);

  if (!route && !destination) return null;

  const positions: [number, number][] =
    route?.coordinates.map(([lng, lat]) => [lat, lng]) ?? [];

  return (
    <>
      <FitRoute />
      {positions.length > 0 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: '#059669', weight: 6, opacity: 0.85 }}
        />
      )}
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Punto de entrega</p>
              {lastDispatch && (
                <>
                  <p>Vehiculo: {lastDispatch.vehicle.plate}</p>
                  <p>Distancia: {lastDispatch.route.distanceKm} km</p>
                  <p>ETA: {lastDispatch.route.durationMin} min</p>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
