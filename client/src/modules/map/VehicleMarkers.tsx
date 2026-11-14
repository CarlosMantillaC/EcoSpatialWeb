import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';
import type { ActiveDispatch, Vehicle, VehicleStatus } from '../../types';

function buildIcon(color: string, ring: string, selected = false) {
  const pulse = selected
    ? '<span style="position:absolute;inset:-6px;border-radius:9999px;border:3px solid #2563eb;animation:vehicle-pulse 1.5s ease-out infinite"></span>'
    : '';
  return L.divIcon({
    className: '',
    html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:3px solid ${ring};box-shadow:0 2px 10px rgba(0,0,0,.35)">${pulse}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

const ICONS: Record<VehicleStatus, L.DivIcon> = {
  libre: buildIcon('#10b981', '#ffffff'),
  en_ruta: buildIcon('#f59e0b', '#ffffff'),
};

const SELECTED_ICONS: Record<VehicleStatus, L.DivIcon> = {
  libre: buildIcon('#10b981', '#2563eb', true),
  en_ruta: buildIcon('#f59e0b', '#2563eb', true),
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  libre: 'Disponible',
  en_ruta: 'En ruta',
};

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'llegando';
  if (seconds < 60) return `~${seconds} s`;
  return `~${Math.ceil(seconds / 60)} min`;
}

function DispatchDetails({ view }: { view: ActiveDispatch }) {
  const percent = Math.round(view.progress * 100);
  return (
    <div className="mt-1 space-y-1 border-t border-slate-200 pt-1">
      <p>
        Destino: {view.destination.lat.toFixed(5)},{' '}
        {view.destination.lng.toFixed(5)}
      </p>
      <p>Llegada simulada en {formatRemaining(view.remainingSec)}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-amber-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">Progreso: {percent}%</p>
    </div>
  );
}

function VehicleMarker({
  vehicle,
  activeDispatch,
}: {
  vehicle: Vehicle;
  activeDispatch?: ActiveDispatch;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const selectedVehicleId = useFleetStore((state) => state.selectedVehicleId);
  const selectVehicle = useFleetStore((state) => state.selectVehicle);
  const selected = selectedVehicleId === vehicle.id;

  // Al seleccionar desde el listado: volar al vehiculo y abrir su popup.
  useEffect(() => {
    if (!selected) return;
    map.flyTo([vehicle.lat, vehicle.lng], Math.max(map.getZoom(), 16), {
      duration: 0.5,
    });
    markerRef.current?.openPopup();
    // Solo reacciona al cambio de seleccion, no a cada movimiento del SSE.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <Marker
      ref={markerRef}
      position={[vehicle.lat, vehicle.lng]}
      icon={selected ? SELECTED_ICONS[vehicle.status] : ICONS[vehicle.status]}
      eventHandlers={{
        click: () => selectVehicle(vehicle.id),
      }}
    >
      <Popup>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{vehicle.plate}</p>
          <p>Conductor: {vehicle.driverName ?? 'Sin asignar'}</p>
          <p>Carga: {vehicle.cargoType ?? 'general'}</p>
          <p>
            Estado:{' '}
            <span
              className={
                vehicle.status === 'libre'
                  ? 'font-semibold text-emerald-600'
                  : 'font-semibold text-amber-600'
              }
            >
              {STATUS_LABEL[vehicle.status]}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}
          </p>

          {vehicle.status === 'en_ruta' && activeDispatch && (
            <DispatchDetails view={activeDispatch} />
          )}
          {vehicle.status === 'en_ruta' && !activeDispatch && (
            <p className="border-t border-slate-200 pt-1 text-xs italic text-slate-500">
              Trafico de fondo · sin despacho activo
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function VehicleMarkers() {
  const vehicles = useFleetStore((state) => state.vehicles);
  const markersVisible = useFleetStore((state) => state.markersVisible);
  const activeDispatches = useFleetStore((state) => state.activeDispatches);

  if (!markersVisible) return null;

  const dispatchByVehicle = new Map(
    activeDispatches.map((view) => [view.vehicle.id, view]),
  );

  return (
    <>
      {vehicles.map((vehicle) => (
        <VehicleMarker
          key={vehicle.id}
          vehicle={vehicle}
          activeDispatch={dispatchByVehicle.get(vehicle.id)}
        />
      ))}
    </>
  );
}
