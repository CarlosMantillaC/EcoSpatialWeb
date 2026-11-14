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
  const preview = useFleetStore((state) => state.preview);

  const geometry = preview?.route.geometry ?? route;

  useEffect(() => {
    if (!geometry || geometry.coordinates.length === 0) return;
    const bounds = L.latLngBounds(
      geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [map, geometry]);

  return null;
}

export function RouteLayer() {
  const route = useFleetStore((state) => state.route);
  const preview = useFleetStore((state) => state.preview);
  const destination = useFleetStore((state) => state.destination);
  const lastDispatch = useFleetStore((state) => state.lastDispatch);

  // La vista previa tiene prioridad: aun no hay despacho aprobado.
  const activeGeometry = preview?.route.geometry ?? route;
  const isPreview = Boolean(preview);

  if (!activeGeometry && !destination) return null;

  const positions: [number, number][] =
    activeGeometry?.coordinates.map(([lng, lat]) => [lat, lng]) ?? [];

  return (
    <>
      <FitRoute />
      {positions.length > 0 && (
        <Polyline
          positions={positions}
          pathOptions={
            isPreview
              ? {
                  color: '#f59e0b',
                  weight: 5,
                  opacity: 0.9,
                  dashArray: '10 8',
                }
              : { color: '#059669', weight: 6, opacity: 0.85 }
          }
        />
      )}
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">
                {isPreview ? 'Destino propuesto' : 'Punto de entrega'}
              </p>
              {preview && (
                <>
                  <p>
                    Vehiculo: {preview.vehicle.plate} (propuesta)
                  </p>
                  <p>Distancia: {preview.route.distanceKm} km</p>
                  <p>ETA: {preview.route.durationMin} min</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Aprueba el viaje en el panel de despacho.
                  </p>
                </>
              )}
              {!preview && lastDispatch && (
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
