import axios from 'axios';
import type {
  AuthResponse,
  AuthUser,
  AuthenticatorMethod,
  Dispatch,
  DispatchResponse,
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
};

export const dispatchApi = {
  list: () => api.get<Dispatch[]>('/dispatch').then((r) => r.data),
  create: (destLat: number, destLng: number, destLabel?: string) =>
    api
      .post<DispatchResponse>('/dispatch', { destLat, destLng, destLabel })
      .then((r) => r.data),
  complete: (id: string) =>
    api.post<Dispatch>(`/dispatch/${id}/complete`).then((r) => r.data),
  cancel: (id: string) =>
    api.post<Dispatch>(`/dispatch/${id}/cancel`).then((r) => r.data),
};

export default api;
