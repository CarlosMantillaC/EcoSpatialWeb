export type VehicleStatus =
  | 'libre'
  | 'en_ruta'
  | 'no_disponible'
  | 'sin_conductor';

/** Roles de la plataforma (viene en el JWT). */
export type UserRole = 'admin' | 'operator';

/** Tipo de carga: capacidad del vehiculo y exigencia del envio. */
export type CargoType =
  | 'general'
  | 'refrigerado'
  | 'fragil'
  | 'express'
  | 'paqueteria';

export const CARGO_TYPES: CargoType[] = [
  'general',
  'refrigerado',
  'fragil',
  'express',
  'paqueteria',
];

export const CARGO_LABELS: Record<CargoType, string> = {
  general: 'General',
  refrigerado: 'Refrigerado',
  fragil: 'Fragil',
  express: 'Express',
  paqueteria: 'Paqueteria',
};

/** Punto de recogida (sucursal): donde el vehiculo carga el envio. */
export interface PickupPoint {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  active: boolean;
  createdAt: string;
}

/** Fases del viaje con recogida. */
export type DispatchPhase = 'to_pickup' | 'loading' | 'to_delivery';

export interface Vehicle {
  id: string;
  plate: string;
  driverName?: string | null;
  driverId?: string | null;
  cargoType: CargoType;
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
  pickupPointId?: string | null;
  cargoType?: CargoType | null;
  productLabel?: string | null;
  quantity?: number | null;
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
  pickupPointId?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupLabel?: string | null;
  cargoType?: CargoType | null;
  productLabel?: string | null;
  quantity?: number | null;
  vehicleId?: string | null;
  distanceKm?: number | null;
  durationMin?: number | null;
  status: 'pendiente' | 'asignado' | 'completado' | 'cancelado';
  routeGeometry?: RouteGeometry | null;
  pickupRouteGeometry?: RouteGeometry | null;
  createdAt: string;
}

/** Tramo de la ruta: vehiculo -> recogida, o recogida -> entrega. */
export interface DispatchLeg {
  distanceKm: number;
  durationMin: number;
  geometry: RouteGeometry;
}

/** Punto de recogida resuelto (elegido o sugerido por el sistema). */
export interface ResolvedPickup {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  suggested: boolean;
}

export interface DispatchResponse {
  dispatch: Dispatch;
  vehicle: Vehicle;
  pickup: ResolvedPickup;
  cargoType: CargoType;
  productLabel: string;
  quantity: number | null;
  /** Tramo 1 (a recoger) y tramo 2 (a entregar). */
  legs: [DispatchLeg, DispatchLeg];
  /** Totales del viaje con geometria concatenada. */
  route: DispatchLeg;
  loadPauseSec: number;
}

/** Resultado de POST /dispatch/preview: no toca estados ni guarda nada. */
export type DispatchPreview = Omit<DispatchResponse, 'dispatch'>;

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
  pickup: { lat: number; lng: number; label: string | null } | null;
  /** Fase actual: va a buscar, esta cargando, o va a entregar. */
  phase: DispatchPhase;
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
  role: UserRole;
}

/** Usuario para la gestion de roles (solo admin). */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Sugerencia de geocodificacion (busqueda por nombre). */
export interface GeocodeSuggestion {
  label: string;
  lat: number;
  lng: number;
}

/** Punto elegido en el mapa para el formulario de ordenes. */
export interface PickedPoint extends LatLng {
  label?: string;
}

export type AuthenticatorMethod = 'device' | 'securityKey' | 'phone';
