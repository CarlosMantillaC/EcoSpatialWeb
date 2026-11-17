import axios from 'axios';
import type {
  ActiveDispatch,
  AdminUser,
  AuditLogEntry,
  AuthResponse,
  AuthUser,
  AuthenticatorMethod,
  CargoType,
  Dispatch,
  DispatchPreview,
  DispatchResponse,
  Driver,
  DriverStatus,
  FleetAlert,
  GeocodeSuggestion,
  PickupPoint,
  ReportSummary,
  ServiceOrder,
  ServiceOrderStatus,
  UserRole,
  Vehicle,
  VehicleStatus,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

let currentToken: string | null = localStorage.getItem('ecospatial_token');

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) {
    localStorage.setItem('ecospatial_token', token);
  } else {
    localStorage.removeItem('ecospatial_token');
  }
}

api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

export const authApi = {
  config: () =>
    api
      .get<{ devLoginEnabled: boolean }>('/auth/config')
      .then((r) => r.data),
  registrationOptions: (email: string, name: string, method: AuthenticatorMethod) =>
    api
      .post<{ flowId: string; options: any }>('/auth/register/options', {
        email,
        name,
        method,
      })
      .then((r) => r.data),
  verifyRegistration: (flowId: string, response: unknown) =>
    api
      .post<AuthResponse>('/auth/register/verify', { flowId, response })
      .then((r) => r.data),
  addDeviceOptions: (method: AuthenticatorMethod) =>
    api
      .post<{ flowId: string; options: any }>('/auth/devices/options', {
        method,
      })
      .then((r) => r.data),
  loginOptions: (email?: string) =>
    api
      .post<{ flowId: string; options: any }>('/auth/login/options', { email })
      .then((r) => r.data),
  verifyLogin: (flowId: string, response: unknown) =>
    api
      .post<AuthResponse>('/auth/login/verify', { flowId, response })
      .then((r) => r.data),
  devLogin: (email: string, name?: string) =>
    api
      .post<AuthResponse>('/auth/dev/login', { email, name })
      .then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const vehiclesApi = {
  list: (status?: VehicleStatus) =>
    api
      .get<Vehicle[]>('/vehicles', { params: status ? { status } : {} })
      .then((r) => r.data),
  listJsonLd: () => api.get('/vehicles', { params: { format: 'jsonld' } }),
  create: (data: {
    plate: string;
    cargoType: CargoType;
    lat: number;
    lng: number;
    driverId?: string | null;
  }) => api.post<Vehicle>('/vehicles', data).then((r) => r.data),
  update: (
    id: string,
    data: {
      plate?: string;
      driverName?: string;
      driverId?: string | null;
      cargoType?: CargoType;
      status?: VehicleStatus;
    },
  ) => api.patch<Vehicle>(`/vehicles/${id}`, data).then((r) => r.data),
};

/** Campos del envio compartidos por preview y creacion de despacho. */
export interface DispatchPayload {
  destLat: number;
  destLng: number;
  destLabel?: string;
  pickupPointId?: string;
  cargoType: CargoType;
  productLabel: string;
  quantity?: number;
  vehicleId?: string;
  orderId?: string;
}

export const dispatchApi = {
  list: () => api.get<Dispatch[]>('/dispatch').then((r) => r.data),
  active: () =>
    api.get<ActiveDispatch[]>('/dispatch/active').then((r) => r.data),
  preview: (payload: DispatchPayload) =>
    api
      .post<DispatchPreview>('/dispatch/preview', payload)
      .then((r) => r.data),
  create: (payload: DispatchPayload) =>
    api.post<DispatchResponse>('/dispatch', payload).then((r) => r.data),
  complete: (id: string) =>
    api.post<Dispatch>(`/dispatch/${id}/complete`).then((r) => r.data),
  cancel: (id: string) =>
    api.post<Dispatch>(`/dispatch/${id}/cancel`).then((r) => r.data),
};

export const pickupPointsApi = {
  list: (activeOnly = false) =>
    api
      .get<PickupPoint[]>('/pickup-points', {
        params: activeOnly ? { active: 'true' } : {},
      })
      .then((r) => r.data),
  create: (data: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
    active?: boolean;
  }) => api.post<PickupPoint>('/pickup-points', data).then((r) => r.data),
  update: (
    id: string,
    data: {
      name?: string;
      address?: string | null;
      lat?: number;
      lng?: number;
      active?: boolean;
    },
  ) => api.patch<PickupPoint>(`/pickup-points/${id}`, data).then((r) => r.data),
};

export const usersApi = {
  list: () => api.get<AdminUser[]>('/users').then((r) => r.data),
  create: (data: { name: string; email: string; role?: UserRole }) =>
    api.post<AdminUser>('/users', data).then((r) => r.data),
  updateRole: (id: string, role: UserRole) =>
    api.patch<AdminUser>(`/users/${id}/role`, { role }).then((r) => r.data),
};

export const driversApi = {
  list: (status?: DriverStatus) =>
    api
      .get<Driver[]>('/drivers', { params: status ? { status } : {} })
      .then((r) => r.data),
  create: (data: {
    name: string;
    license?: string;
    phone?: string;
  }) => api.post<Driver>('/drivers', data).then((r) => r.data),
  update: (
    id: string,
    data: { name?: string; license?: string; phone?: string; status?: DriverStatus },
  ) => api.patch<Driver>(`/drivers/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/drivers/${id}`).then((r) => r.data),
};

export const ordersApi = {
  list: (status?: ServiceOrderStatus) =>
    api
      .get<ServiceOrder[]>('/orders', { params: status ? { status } : {} })
      .then((r) => r.data),
  create: (data: {
    clientName: string;
    contact?: string;
    destLat: number;
    destLng: number;
    destLabel?: string;
    pickupPointId: string;
    cargoType: CargoType;
    productLabel: string;
    quantity?: number;
    priority?: 'baja' | 'media' | 'alta';
    notes?: string;
  }) => api.post<ServiceOrder>('/orders', data).then((r) => r.data),
  cancel: (id: string) =>
    api.post<ServiceOrder>(`/orders/${id}/cancel`).then((r) => r.data),
  remove: (id: string) => api.delete(`/orders/${id}`).then((r) => r.data),
};

export const alertsApi = {
  list: (unreadOnly = false) =>
    api
      .get<FleetAlert[]>('/alerts', {
        params: unreadOnly ? { unread: 'true' } : {},
      })
      .then((r) => r.data),
  markRead: (id: string) =>
    api.patch<FleetAlert>(`/alerts/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    api.post<{ updated: number }>('/alerts/read-all').then((r) => r.data),
};

export const auditApi = {
  list: (limit = 50) =>
    api
      .get<AuditLogEntry[]>('/audit', { params: { limit } })
      .then((r) => r.data),
};

export const geocodeApi = {
  /** Busca lugares por nombre (restringidos al area de Cucuta). */
  search: (q: string, limit = 5) =>
    api
      .get<GeocodeSuggestion[]>('/geocode', { params: { q, limit } })
      .then((r) => r.data),
  /** Nombre legible de un punto; puede ser null si no hay proveedor. */
  reverse: (lat: number, lng: number) =>
    api
      .get<{ label: string | null }>('/geocode/reverse', { params: { lat, lng } })
      .then((r) => r.data),
};

export const reportsApi = {
  summary: (from?: string, to?: string) =>
    api
      .get<ReportSummary>('/reports/summary', { params: { from, to } })
      .then((r) => r.data),
  /** Descarga el CSV de despachos en el navegador. */
  downloadDispatchesCsv: async (from?: string, to?: string) => {
    const response = await api.get<Blob>('/reports/dispatches.csv', {
      params: { from, to },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'despachos.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export default api;
