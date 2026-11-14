export type VehicleStatus = 'libre' | 'en_ruta';

export interface Vehicle {
  id: string;
  plate: string;
  driverName?: string | null;
  cargoType?: string | null;
  status: VehicleStatus;
  lat: number;
  lng: number;
  lastUpdate: string;
  createdAt: string;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface Dispatch {
  id: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  destLabel?: string | null;
  vehicleId?: string | null;
  distanceKm?: number | null;
  durationMin?: number | null;
  status: 'pendiente' | 'asignado' | 'completado' | 'cancelado';
  routeGeometry?: RouteGeometry | null;
  createdAt: string;
}

export interface DispatchResponse {
  dispatch: Dispatch;
  vehicle: Vehicle;
  route: {
    distanceKm: number;
    durationMin: number;
    geometry: RouteGeometry;
  };
}

/** Resultado de POST /dispatch/preview: no toca estados ni guarda nada. */
export interface DispatchPreview {
  destination: LatLng;
  vehicle: Vehicle;
  route: {
    distanceKm: number;
    durationMin: number;
    geometry: RouteGeometry;
  };
}

/** Despacho activo enriquecido con progreso (GET /dispatch/active). */
export interface ActiveDispatch {
  dispatch: Dispatch;
  vehicle: Vehicle;
  /** Avance del viaje en [0, 1]. */
  progress: number;
  /** Segundos restantes del viaje simulado. */
  remainingSec: number;
  origin: LatLng;
  destination: LatLng;
}

/** Payload del evento SSE `fleet`. */
export interface FleetUpdate {
  vehicles: Vehicle[];
  activeDispatches: ActiveDispatch[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type AuthenticatorMethod = 'device' | 'securityKey' | 'phone';
