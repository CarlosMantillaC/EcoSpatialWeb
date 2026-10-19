import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';
import type { Vehicle, VehicleStatus } from '../../types';

function buildIcon(color: string, ring: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:3px solid ${ring};box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

const ICONS: Record<VehicleStatus, L.DivIcon> = {
  libre: buildIcon('#10b981', '#ffffff'),
  en_ruta: buildIcon('#f59e0b', '#ffffff'),
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  libre: 'Disponible',
  en_ruta: 'En ruta',
};

function VehicleMarker({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={ICONS[vehicle.status]}>
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
        </div>
      </Popup>
    </Marker>
  );
}

export function VehicleMarkers() {
  const vehicles = useFleetStore((state) => state.vehicles);
  const markersVisible = useFleetStore((state) => state.markersVisible);

  if (!markersVisible) return null;

  return (
    <>
      {vehicles.map((vehicle) => (
        <VehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}
    </>
  );
}
