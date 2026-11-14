import { Coords, LineStringCoords, positionAlongRoute } from '../../common/geo';

/** Estado de deambulacion de un vehiculo sin despacho activo. */
export interface WanderState {
  /** Ruta OSRM real (LineString de [lng, lat]). */
  geometry: LineStringCoords;
  from: Coords;
  to: Coords;
  /** Avance de la ruta en [0, 1]. */
  progress: number;
  /** Duracion real de la ruta segun OSRM (segundos). */
  durationSec: number;
}

export interface WanderStep {
  state: WanderState;
  position: Coords;
  /** true cuando el vehiculo llego al destino de su ruta actual. */
  arrived: boolean;
}

/** Distancia objetivo de los trayectos de fondo (km). */
export const WANDER_MIN_KM = 1;
export const WANDER_MAX_KM = 3;

/**
 * Avanza un deambulante `intervalSec` segundos a lo largo de su ruta
 * real. La velocidad resultante es la de la propia ruta de OSRM
 * (~30-50 km/h urbanos). Es una funcion pura: no toca bases de datos.
 */
export function wanderStep(state: WanderState, intervalSec: number): WanderStep {
  const advance = state.durationSec > 0 ? intervalSec / state.durationSec : 1;
  const progress = Math.min(1, Math.max(0, state.progress + advance));
  const next: WanderState = { ...state, progress };
  return {
    state: next,
    position: positionAlongRoute(next.geometry, progress, {
      from: next.from,
      to: next.to,
    }),
    arrived: progress >= 1,
  };
}

/**
 * Punto aleatorio entre `minKm` y `maxKm` de `origin`, acotado al area
 * de operacion (`center` +/- `maxRadiusDeg`). `rand` se inyecta para
 * poder probarlo de forma determinista.
 */
export function randomWaypoint(
  origin: Coords,
  center: Coords,
  minKm = WANDER_MIN_KM,
  maxKm = WANDER_MAX_KM,
  maxRadiusDeg = 0.05,
  rand: () => number = Math.random,
): Coords {
  const angle = rand() * 2 * Math.PI;
  const distanceKm = minKm + rand() * (maxKm - minKm);
  const dLat = (distanceKm / 110.574) * Math.cos(angle);
  const dLng =
    (distanceKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180))) *
    Math.sin(angle);

  const clamp = (value: number, base: number) =>
    Math.min(base + maxRadiusDeg, Math.max(base - maxRadiusDeg, value));

  return {
    lat: clamp(origin.lat + dLat, center.lat),
    lng: clamp(origin.lng + dLng, center.lng),
  };
}
