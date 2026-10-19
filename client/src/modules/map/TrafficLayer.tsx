import { CircleMarker, Tooltip } from 'react-leaflet';
import { useFleetStore } from '../../store/fleet';
import { BASE_COORDINATE } from '../../store/map';

interface Incident {
  lat: number;
  lng: number;
  radius: number;
  level: 'alto' | 'medio';
}

const INCIDENTS: Incident[] = [
  { lat: BASE_COORDINATE.lat + 0.012, lng: BASE_COORDINATE.lng - 0.018, radius: 900, level: 'alto' },
  { lat: BASE_COORDINATE.lat - 0.02, lng: BASE_COORDINATE.lng + 0.01, radius: 1100, level: 'medio' },
  { lat: BASE_COORDINATE.lat + 0.03, lng: BASE_COORDINATE.lng + 0.025, radius: 700, level: 'medio' },
  { lat: BASE_COORDINATE.lat - 0.035, lng: BASE_COORDINATE.lng - 0.03, radius: 1300, level: 'alto' },
  { lat: BASE_COORDINATE.lat + 0.005, lng: BASE_COORDINATE.lng + 0.04, radius: 800, level: 'medio' },
];

export function TrafficLayer() {
  const showTraffic = useFleetStore((state) => state.showTraffic);
  if (!showTraffic) return null;

  return (
    <>
      {INCIDENTS.map((incident, index) => (
        <CircleMarker
          key={index}
          center={[incident.lat, incident.lng]}
          radius={incident.radius / 45}
          pathOptions={{
            color: incident.level === 'alto' ? '#dc2626' : '#f97316',
            fillColor: incident.level === 'alto' ? '#dc2626' : '#f97316',
            fillOpacity: 0.25,
            weight: 1.5,
          }}
        >
          <Tooltip direction="top">
            Trafico {incident.level} (simulado)
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
