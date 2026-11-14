import { create } from 'zustand';
import type {
  ActiveDispatch,
  DispatchPreview,
  DispatchResponse,
  FleetUpdate,
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
  /** Flota completa (sin filtrar) tal y como la sirve el servidor. */
  allVehicles: Vehicle[];
  /** Vista filtrada: la que pintan los marcadores. */
  vehicles: Vehicle[];
  stats: FleetStats;
  filter: FleetFilter;
  /** Despachos activos con progreso (para popups y panel). */
  activeDispatches: ActiveDispatch[];
  /** Vehiculo seleccionado en el listado o en el mapa (resaltado). */
  selectedVehicleId: string | null;
  markersVisible: boolean;
  showTraffic: boolean;
  loading: boolean;
  error: string | null;
  /** Aviso no bloqante (ej. "servicio completado automaticamente"). */
  notice: string | null;
  lastDispatch: DispatchResponse | null;
  /** Destino elegido aun sin aprobar. */
  preview: DispatchPreview | null;
  route: RouteGeometry | null;
  destination: LatLng | null;
  loadVehicles: (filter?: FleetFilter) => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: FleetFilter) => void;
  /** Selecciona un vehiculo (lista <-> mapa). null limpia la seleccion. */
  selectVehicle: (vehicleId: string | null) => void;
  /** Aplica un update completo (SSE o fetch) y recalcula la vista. */
  applyFleetUpdate: (update: FleetUpdate) => void;
  setShowTraffic: (value: boolean) => void;
  clearMarkers: () => void;
  /** Paso 1: elige destino y calcula vista previa (sin asignar nada). */
  selectDestination: (lat: number, lng: number, label?: string) => Promise<void>;
  /** Descarta la vista previa sin tocar el despacho activo. */
  discardPreview: () => void;
  /** Paso 2: aprueba y crea el despacho. */
  approveDispatch: () => Promise<void>;
  /** Oculta la ruta en el mapa pero conserva el despacho activo. */
  clearRoute: () => void;
  /** Vuelve a pintar la ruta del despacho activo. */
  showRoute: () => void;
  completeLastDispatch: () => Promise<void>;
  cancelLastDispatch: () => Promise<void>;
  /** El backend cerro el despacho: limpia el panel y avisa. */
  handleDispatchCompleted: (dispatchId: string) => void;
}

function computeStats(vehicles: Vehicle[]): FleetStats {
  return {
    total: vehicles.length,
    libre: vehicles.filter((vehicle) => vehicle.status === 'libre').length,
    en_ruta: vehicles.filter((vehicle) => vehicle.status === 'en_ruta').length,
  };
}

function applyFilter(
  vehicles: Vehicle[],
  filter: FleetFilter,
  keepIds?: Set<string>,
): Vehicle[] {
  return vehicles.filter(
    (vehicle) =>
      filter === 'all' ||
      vehicle.status === filter ||
      keepIds?.has(vehicle.id),
  );
}

/** Vehiculos que no deben ocultarse nunca: con despacho activo o seleccionados. */
function keepSet(activeDispatches: ActiveDispatch[], selectedId: string | null): Set<string> {
  const keep = new Set(activeDispatches.map((view) => view.vehicle.id));
  if (selectedId) keep.add(selectedId);
  return keep;
}

function apiMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  allVehicles: [],
  vehicles: [],
  stats: { total: 0, libre: 0, en_ruta: 0 },
  filter: 'all',
  activeDispatches: [],
  selectedVehicleId: null,
  markersVisible: true,
  showTraffic: false,
  loading: false,
  error: null,
  notice: null,
  lastDispatch: null,
  preview: null,
  route: null,
  destination: null,

  applyFleetUpdate: (update) => {
    const { filter, selectedVehicleId } = get();
    set({
      allVehicles: update.vehicles,
      vehicles: applyFilter(
        update.vehicles,
        filter,
        keepSet(update.activeDispatches, selectedVehicleId),
      ),
      stats: computeStats(update.vehicles),
      activeDispatches: update.activeDispatches,
      // Si el vehiculo seleccionado dejo de existir, se limpia.
      selectedVehicleId:
        selectedVehicleId &&
        update.vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
          ? selectedVehicleId
          : null,
    });
  },

  loadVehicles: async (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ loading: true, error: null, filter: activeFilter });
    try {
      const [vehicles, activeDispatches] = await Promise.all([
        vehiclesApi.list(),
        dispatchApi.active(),
      ]);
      set({
        allVehicles: vehicles,
        vehicles: applyFilter(
          vehicles,
          activeFilter,
          keepSet(activeDispatches, get().selectedVehicleId),
        ),
        stats: computeStats(vehicles),
        activeDispatches,
        loading: false,
        markersVisible: true,
      });
    } catch {
      set({
        loading: false,
        error: 'No se pudo cargar la flota. Verifica la sesion.',
      });
    }
  },

  refresh: async () => {
    try {
      const [vehicles, activeDispatches] = await Promise.all([
        vehiclesApi.list(),
        dispatchApi.active(),
      ]);

      // Respaldo del auto-completado por si el SSE esta caido: si el
      // despacho del panel ya no esta activo, se cerro en el servidor.
      const last = get().lastDispatch;
      if (
        last &&
        !activeDispatches.some((view) => view.dispatch.id === last.dispatch.id)
      ) {
        set({
          lastDispatch: null,
          preview: null,
          route: null,
          destination: null,
          notice: 'Servicio completado automaticamente.',
        });
      }

      get().applyFleetUpdate({ vehicles, activeDispatches });
    } catch {
      /* refresco silencioso */
    }
  },

  setFilter: (filter) => {
    const { allVehicles, activeDispatches, selectedVehicleId } = get();
    set({
      filter,
      vehicles: applyFilter(
        allVehicles,
        filter,
        keepSet(activeDispatches, selectedVehicleId),
      ),
      markersVisible: true,
    });
  },

  selectVehicle: (vehicleId) => set({ selectedVehicleId: vehicleId }),

  setShowTraffic: (value) => set({ showTraffic: value }),

  clearMarkers: () => set({ markersVisible: false }),

  selectDestination: async (lat, lng, label) => {
    const { lastDispatch, loading } = get();
    if (loading) return;

    if (lastDispatch) {
      set({
        notice:
          'Hay un despacho activo: completalo o cancelalo antes de elegir otro destino.',
      });
      return;
    }

    const destination = { lat, lng };
    set({ loading: true, error: null, notice: null, destination, preview: null });
    try {
      const result = await dispatchApi.preview(lat, lng, label);
      set({ preview: { destination, ...result }, loading: false });
    } catch (error) {
      set({
        loading: false,
        destination: null,
        error: apiMessage(error, 'No se pudo calcular la ruta. Intenta de nuevo.'),
      });
    }
  },

  discardPreview: () =>
    set({ preview: null, destination: null, notice: null, error: null }),

  approveDispatch: async () => {
    const { preview, loading } = get();
    if (!preview || loading) return;

    const { destination, vehicle } = preview;
    set({ loading: true, error: null, notice: null });
    try {
      const result = await dispatchApi.create(
        destination.lat,
        destination.lng,
        undefined,
        vehicle.id,
      );
      set({
        lastDispatch: result,
        route: result.route.geometry,
        destination,
        preview: null,
        loading: false,
      });
      await get().refresh();
    } catch (error) {
      set({
        loading: false,
        error: apiMessage(error, 'No se pudo crear el despacho. Intenta de nuevo.'),
      });
    }
  },

  clearRoute: () => set({ route: null, destination: null }),

  showRoute: () => {
    const dispatch = get().lastDispatch;
    if (!dispatch) return;
    set({
      route: dispatch.route.geometry,
      destination: {
        lat: dispatch.dispatch.destLat,
        lng: dispatch.dispatch.destLng,
      },
    });
  },

  completeLastDispatch: async () => {
    const dispatch = get().lastDispatch;
    if (!dispatch) return;
    set({ loading: true, error: null, notice: null });
    try {
      await dispatchApi.complete(dispatch.dispatch.id);
      set({
        lastDispatch: null,
        preview: null,
        route: null,
        destination: null,
        loading: false,
        notice: 'Servicio completado.',
      });
      await get().refresh();
    } catch (error) {
      set({
        loading: false,
        error: apiMessage(error, 'No se pudo completar el despacho.'),
      });
    }
  },

  cancelLastDispatch: async () => {
    const dispatch = get().lastDispatch;
    if (!dispatch) return;
    set({ loading: true, error: null, notice: null });
    try {
      await dispatchApi.cancel(dispatch.dispatch.id);
      set({
        lastDispatch: null,
        preview: null,
        route: null,
        destination: null,
        loading: false,
        notice: 'Despacho cancelado y vehiculo liberado.',
      });
      await get().refresh();
    } catch (error) {
      set({
        loading: false,
        error: apiMessage(error, 'No se pudo cancelar el despacho.'),
      });
    }
  },

  handleDispatchCompleted: (dispatchId) => {
    const last = get().lastDispatch;
    if (last?.dispatch.id === dispatchId) {
      set({
        lastDispatch: null,
        preview: null,
        route: null,
        destination: null,
        notice: 'Servicio completado automaticamente.',
      });
    }
  },
}));
