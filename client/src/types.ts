export type VehicleStatus =
  | 'libre'
  | 'en_ruta'
  | 'no_disponible'
  | 'sin_conductor';

export interface Vehicle {
  id: string;
  plate: string;
  driverName?: string | null;
  driverId?: string | null;
  cargoType?: string | null;
  status: VehicleStatus;
  lat: number;
  lng: number;
  lastUpdate: string;
  createdAt: string;
}

export type DriverStatus = 'disponible' | 'en_viaje' | 'fuera';

export interface Driver {
  id: string;
  name: string;
  license?: string | null;
  phone?: string | null;
  status: DriverStatus;
  lastUpdate: string;
  createdAt: string;
}

export type ServiceOrderStatus =
  | 'pendiente'
  | 'asignada'
  | 'completada'
  | 'cancelada';

export type ServiceOrderPriority = 'baja' | 'media' | 'alta';

export interface ServiceOrder {
  id: string;
  clientName: string;
  contact?: string | null;
  destLat: number;
  destLng: number;
  destLabel?: string | null;
  priority: ServiceOrderPriority;
  windowStart?: string | null;
  windowEnd?: string | null;
  notes?: string | null;
  status: ServiceOrderStatus;
  dispatchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'geocerca' | 'velocidad' | 'llegada' | 'sistema';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface FleetAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  vehicleId?: string | null;
  dispatchId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReportSummary {
  range: { from: string; to: string };
  dispatches: {
    total: number;
    completados: number;
    cancelados: number;
    activos: number;
    distanciaKm: number;
    tiempoPromedioMin: number;
  };
  perDay: Array<{
    fecha: string;
    despachos: number;
    completados: number;
    distanciaKm: number;
  }>;
  topVehicles: Array<{
    placa: string;
    conductor?: string | null;
    despachos: number;
    distanciaKm: number;
  }>;
  fleet: { total: number; libre: number; enRuta: number; sinConductor: number };
  orders: {
    total: number;
    pendientes: number;
    asignadas: number;
    completadas: number;
    canceladas: number;
  };
  alerts: { total: number; noLeidas: number; criticas: number };
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
