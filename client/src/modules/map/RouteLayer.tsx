import L from 'leaflet';
import { useEffect } from 'react';
import { Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';
import type { DispatchLeg, ResolvedPickup } from '../../types';

const destinationIcon = L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#ef4444;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,.4);color:#fff;font-size:16px;font-weight:700">&#9873;</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
  popupAnchor: [0, -26],
});

const pickupIcon = L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,.4);color:#fff;font-size:14px;font-weight:700">&#128230;</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -24],
});

function legPositions(leg?: DispatchLeg | null): [number, number][] {
  return (
    leg?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) ??
    []
  );
}

function FitRoute() {
  const map = useMap();
  const route = useFleetStore((state) => state.route);
  const routeLegs = useFleetStore((state) => state.routeLegs);
  const preview = useFleetStore((state) => state.preview);

  const legs = preview?.legs ?? routeLegs;
  const geometry = legs ? undefined : preview?.route.geometry ?? route;

  useEffect(() => {
    const coordinates: [number, number][] = legs
      ? [...legPositions(legs[0]), ...legPositions(legs[1])]
      : (geometry?.coordinates ?? []).map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
    if (coordinates.length === 0) return;
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [map, legs, geometry]);

  return null;
}

export function RouteLayer() {
  const route = useFleetStore((state) => state.route);
  const routeLegs = useFleetStore((state) => state.routeLegs);
  const pickup = useFleetStore((state) => state.pickup);
  const preview = useFleetStore((state) => state.preview);
  const destination = useFleetStore((state) => state.destination);
  const lastDispatch = useFleetStore((state) => state.lastDispatch);

  // La vista previa tiene prioridad: aun no hay despacho aprobado.
  const isPreview = Boolean(preview);
  const legs: [DispatchLeg, DispatchLeg] | null = preview
    ? preview.legs
    : routeLegs;
  const activePickup: ResolvedPickup | null = preview?.pickup ?? pickup;
  const activeGeometry = preview?.route.geometry ?? route;

  if (!activeGeometry && !destination) return null;

  const positions: [number, number][] = activeGeometry
    ? activeGeometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      )
    : [];
  const leg1 = legs ? legPositions(legs[0]) : [];
  const leg2 = legs ? legPositions(legs[1]) : [];

  return (
    <>
      <FitRoute />
      {legs ? (
        <>
          {/* Tramo 1: vehiculo -> recogida */}
          {leg1.length > 0 && (
            <Polyline
              positions={leg1}
              pathOptions={
                isPreview
                  ? { color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '10 8' }
                  : { color: '#2563eb', weight: 6, opacity: 0.85 }
              }
            />
          )}
          {/* Tramo 2: recogida -> entrega */}
          {leg2.length > 0 && (
            <Polyline
              positions={leg2}
              pathOptions={
                isPreview
                  ? { color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '10 8' }
                  : { color: '#059669', weight: 6, opacity: 0.85 }
              }
            />
          )}
        </>
      ) : (
        positions.length > 0 && (
          <Polyline
            positions={positions}
            pathOptions={
              isPreview
                ? { color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '10 8' }
                : { color: '#059669', weight: 6, opacity: 0.85 }
            }
          />
        )
      )}
      {activePickup && (
        <Marker
          position={[activePickup.lat, activePickup.lng]}
          icon={pickupIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">
                Punto de recogida{activePickup.suggested ? ' (sugerido)' : ''}
              </p>
              <p>{activePickup.name}</p>
              {activePickup.address && <p>{activePickup.address}</p>}
              {preview && (
                <p className="mt-1 text-xs text-slate-500">
                  Tramo 1: {preview.legs[0].distanceKm} km ·{' '}
                  {preview.legs[0].durationMin} min
                </p>
              )}
              {!preview && lastDispatch && (
                <p className="mt-1 text-xs text-slate-500">
                  {lastDispatch.productLabel}
                  {lastDispatch.quantity
                    ? ` × ${lastDispatch.quantity}`
                    : ''}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
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
                  <p>
                    Tramo 2: {preview.legs[1].distanceKm} km ·{' '}
                    {preview.legs[1].durationMin} min
                  </p>
                  <p>
                    Total: {preview.route.distanceKm} km ·{' '}
                    {preview.route.durationMin} min
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Aprueba el viaje en el panel de despacho.
                  </p>
                </>
              )}
              {!preview && lastDispatch && (
                <>
                  <p>Vehiculo: {lastDispatch.vehicle.plate}</p>
                  <p>
                    {lastDispatch.productLabel}
                    {lastDispatch.quantity
                      ? ` × ${lastDispatch.quantity}`
                      : ''}
                  </p>
                  <p>
                    Total: {lastDispatch.route.distanceKm} km ·{' '}
                    {lastDispatch.route.durationMin} min
                  </p>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
