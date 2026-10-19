import { create } from 'zustand';
import type {
  DispatchResponse,
  LatLng,
  RouteGeometry,
  Vehicle,
  VehicleStatus,
} from '../types';
import { dispatchApi, vehiclesApi } from '../lib/api';

export type FleetFilter = 'all' | VehicleStatus;

export interface FleetStats {
  total: number;
  libre: number;
  en_ruta: number;
}

interface FleetState {
  vehicles: Vehicle[];
  stats: FleetStats;
  filter: FleetFilter;
  markersVisible: boolean;
  showTraffic: boolean;
  loading: boolean;
  error: string | null;
  lastDispatch: DispatchResponse | null;
  route: RouteGeometry | null;
  destination: LatLng | null;
  loadVehicles: (filter?: FleetFilter) => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: FleetFilter) => Promise<void>;
  setShowTraffic: (value: boolean) => void;
  clearMarkers: () => void;
  setDestination: (destination: LatLng | null) => void;
  createDispatch: (lat: number, lng: number, label?: string) => Promise<void>;
  clearRoute: () => void;
  completeLastDispatch: () => Promise<void>;
}

function computeStats(vehicles: Vehicle[]): FleetStats {
  return {
    total: vehicles.length,
    libre: vehicles.filter((vehicle) => vehicle.status === 'libre').length,
    en_ruta: vehicles.filter((vehicle) => vehicle.status === 'en_ruta').length,
  };
}

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: [],
  stats: { total: 0, libre: 0, en_ruta: 0 },
  filter: 'all',
  markersVisible: true,
  showTraffic: false,
  loading: false,
  error: null,
  lastDispatch: null,
  route: null,
  destination: null,

  loadVehicles: async (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ loading: true, error: null, filter: activeFilter });
    try {
      const [vehicles, allVehicles] = await Promise.all([
        vehiclesApi.list(activeFilter === 'all' ? undefined : activeFilter),
        activeFilter === 'all' ? Promise.resolve(null) : vehiclesApi.list(),
      ]);
      set({
        vehicles,
        stats: computeStats(allVehicles ?? vehicles),
        loading: false,
        markersVisible: true,
      });
    } catch (error) {
      set({
        loading: false,
        error: 'No se pudo cargar la flota. Verifica la sesion.',
      });
    }
  },

  refresh: async () => {
    const filter = get().filter;
    try {
      const [vehicles, allVehicles] = await Promise.all([
        vehiclesApi.list(filter === 'all' ? undefined : filter),
        filter === 'all' ? Promise.resolve(null) : vehiclesApi.list(),
      ]);
      set({ vehicles, stats: computeStats(allVehicles ?? vehicles) });
    } catch {
      /* refresco silencioso */
    }
  },

  setFilter: async (filter) => {
    await get().loadVehicles(filter);
  },

  setShowTraffic: (value) => set({ showTraffic: value }),

  clearMarkers: () => set({ markersVisible: false }),

  setDestination: (destination) => set({ destination }),

  createDispatch: async (lat, lng, label) => {
    set({ loading: true, error: null });
    try {
      const result = await dispatchApi.create(lat, lng, label);
      set({
        lastDispatch: result,
        route: result.route.geometry,
        destination: { lat, lng },
        loading: false,
      });
      await get().refresh();
    } catch (error: any) {
      set({
        loading: false,
        error:
          error?.response?.data?.message ??
          'No se pudo crear el despacho. Intenta de nuevo.',
      });
    }
  },

  clearRoute: () =>
    set({ route: null, destination: null, lastDispatch: null }),

  completeLastDispatch: async () => {
    const dispatch = get().lastDispatch;
    if (!dispatch) return;
    try {
      await dispatchApi.complete(dispatch.dispatch.id);
      set({ lastDispatch: null, route: null, destination: null });
      await get().refresh();
    } catch {
      set({ error: 'No se pudo completar el despacho.' });
    }
  },
}));
