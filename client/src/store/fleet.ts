import { create } from 'zustand';
import type {
  ActiveDispatch,
  CargoType,
  DispatchLeg,
  DispatchPreview,
  DispatchResponse,
  FleetUpdate,
  LatLng,
  ResolvedPickup,
  RouteGeometry,
  ServiceOrder,
  Vehicle,
  VehicleStatus,
} from '../types';
import { dispatchApi, vehiclesApi, type DispatchPayload } from '../lib/api';
import { useOpsStore } from './ops';

export type FleetFilter = 'all' | VehicleStatus;

export interface FleetStats {
  total: number;
  libre: number;
  en_ruta: number;
  no_disponible: number;
  sin_conductor: number;
}

/** Borrador del envio que la operadora completa antes de previsualizar. */
export interface DispatchDraft {
  cargoType: CargoType;
  productLabel: string;
  quantity: number | null;
  /** null = dejar que el sistema sugiera el punto de recogida. */
  pickupPointId: string | null;
}

const EMPTY_DRAFT: DispatchDraft = {
  cargoType: 'general',
  productLabel: '',
  quantity: null,
  pickupPointId: null,
};

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
  /** Vista previa del viaje pendiente de aprobacion. */
  preview: DispatchPreview | null;
  /** Orden de servicio que origina el despacho en curso (si aplica). */
  pendingOrder: ServiceOrder | null;
  /** Borrador del envio (recogida, tipo de carga, producto). */
  draft: DispatchDraft;
  route: RouteGeometry | null;
  routeLegs: [DispatchLeg, DispatchLeg] | null;
  pickup: ResolvedPickup | null;
  destination: LatLng | null;
  destLabel: string | null;
  loadVehicles: (filter?: FleetFilter) => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: FleetFilter) => void;
  /** Selecciona un vehiculo (lista <-> mapa). null limpia la seleccion. */
  selectVehicle: (vehicleId: string | null) => void;
  /** Aplica un update completo (SSE o fetch) y recalcula la vista. */
  applyFleetUpdate: (update: FleetUpdate) => void;
  setShowTraffic: (value: boolean) => void;
  clearMarkers: () => void;
  /** Vuelve a pintar los vehiculos tras un "limpiar pantalla". */
  showMarkers: () => void;
  /** Paso 1: elige destino en el mapa (abre el formulario del envio). */
  selectDestination: (lat: number, lng: number, label?: string) => void;
  /** Completa el borrador del envio (tipo, producto, recogida). */
  setDraft: (draft: Partial<DispatchDraft>) => void;
  /** Cambia el punto de recogida y recalcula la vista previa. */
  changePickup: (pickupPointId: string | null) => Promise<void>;
  /** Paso 2: calcula la vista previa (sin asignar nada). */
  runPreview: () => Promise<void>;
  /** Paso 2 desde una orden: preview con los datos del envio. */
  startOrderDispatch: (order: ServiceOrder) => Promise<void>;
  /** Descarta la vista previa sin tocar el despacho activo. */
  discardPreview: () => void;
  /** Paso 3: aprueba y crea el despacho. */
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
    no_disponible: vehicles.filter(
      (vehicle) => vehicle.status === 'no_disponible',
    ).length,
    sin_conductor: vehicles.filter(
      (vehicle) => vehicle.status === 'sin_conductor',
    ).length,
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

/** Vehiculos que no deben ocultarse nunca: los que tienen despacho activo. */
function keepSet(activeDispatches: ActiveDispatch[]): Set<string> {
  return new Set(activeDispatches.map((view) => view.vehicle.id));
}

function apiMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  allVehicles: [],
  vehicles: [],
  stats: { total: 0, libre: 0, en_ruta: 0, no_disponible: 0, sin_conductor: 0 },
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
  pendingOrder: null,
  draft: { ...EMPTY_DRAFT },
  route: null,
  routeLegs: null,
  pickup: null,
  destination: null,
  destLabel: null,

  applyFleetUpdate: (update) => {
    const { filter, selectedVehicleId } = get();
    set({
      allVehicles: update.vehicles,
      vehicles: applyFilter(
        update.vehicles,
        filter,
        keepSet(update.activeDispatches),
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
          keepSet(activeDispatches),
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
          pendingOrder: null,
          route: null,
          routeLegs: null,
          pickup: null,
          destination: null,
          destLabel: null,
          notice: 'Servicio completado automaticamente.',
        });
        void useOpsStore.getState().loadOrders();
      }

      get().applyFleetUpdate({ vehicles, activeDispatches });
    } catch {
      /* refresco silencioso */
    }
  },

  setFilter: (filter) => {
    const { allVehicles, activeDispatches } = get();
    set({
      filter,
      vehicles: applyFilter(
        allVehicles,
        filter,
        keepSet(activeDispatches),
      ),
      markersVisible: true,
    });
  },

  selectVehicle: (vehicleId) => set({ selectedVehicleId: vehicleId }),

  setShowTraffic: (value) => set({ showTraffic: value }),

  clearMarkers: () => set({ markersVisible: false }),
  showMarkers: () => set({ markersVisible: true }),

  selectDestination: (lat, lng, label) => {
    const { lastDispatch, loading } = get();
    if (loading) return;

    if (lastDispatch) {
      set({
        notice:
          'Hay un despacho activo: completalo o cancelalo antes de elegir otro destino.',
      });
      return;
    }

    set({
      destination: { lat, lng },
      destLabel: label ?? null,
      preview: null,
      error: null,
      notice: null,
      draft: { ...EMPTY_DRAFT },
    });
  },

  setDraft: (draft) => set({ draft: { ...get().draft, ...draft } }),

  changePickup: async (pickupPointId) => {
    set({ draft: { ...get().draft, pickupPointId } });
    if (get().preview) {
      await get().runPreview();
    }
  },

  runPreview: async () => {
    const { destination, draft, pendingOrder, loading } = get();
    if (!destination || loading) return;
    if (!draft.productLabel.trim()) {
      set({ error: 'Describe el producto o contenido del envio.' });
      return;
    }

    const payload: DispatchPayload = {
      destLat: destination.lat,
      destLng: destination.lng,
      destLabel: get().destLabel ?? undefined,
      pickupPointId: draft.pickupPointId ?? undefined,
      cargoType: draft.cargoType,
      productLabel: draft.productLabel.trim(),
      quantity: draft.quantity ?? undefined,
      orderId: pendingOrder?.id,
    };

    set({ loading: true, error: null, notice: null });
    try {
      const result = await dispatchApi.preview(payload);
      set({
        preview: result,
        // La sugerencia del sistema se materializa en el borrador: la
        // operadora puede cambiarla y el viaje se recalcula.
        draft: {
          ...draft,
          pickupPointId: result.pickup.id,
        },
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        preview: null,
        error: apiMessage(error, 'No se pudo calcular la ruta. Intenta de nuevo.'),
      });
    }
  },

  discardPreview: () =>
    set({
      preview: null,
      destination: null,
      destLabel: null,
      pendingOrder: null,
      draft: { ...EMPTY_DRAFT },
      notice: null,
      error: null,
    }),

  startOrderDispatch: async (order) => {
    set({
      pendingOrder: order,
      destination: { lat: order.destLat, lng: order.destLng },
      destLabel: order.destLabel ?? order.clientName,
      preview: null,
      error: null,
      notice: null,
      draft: {
        cargoType: order.cargoType ?? 'general',
        productLabel: order.productLabel ?? 'Envio',
        quantity: order.quantity ?? null,
        pickupPointId: order.pickupPointId ?? null,
      },
    });
    await get().runPreview();
  },

  approveDispatch: async () => {
    const { preview, pendingOrder, destination, draft, loading } = get();
    if (!preview || !destination || loading) return;

    set({ loading: true, error: null, notice: null });
    try {
      const result = await dispatchApi.create({
        destLat: destination.lat,
        destLng: destination.lng,
        destLabel: get().destLabel ?? undefined,
        pickupPointId: preview.pickup.id,
        cargoType: draft.cargoType,
        productLabel: draft.productLabel.trim(),
        quantity: draft.quantity ?? undefined,
        vehicleId: preview.vehicle.id,
        orderId: pendingOrder?.id,
      });
      set({
        lastDispatch: result,
        route: result.route.geometry,
        routeLegs: result.legs,
        pickup: result.pickup,
        destination: {
          lat: result.dispatch.destLat,
          lng: result.dispatch.destLng,
        },
        destLabel: result.dispatch.destLabel ?? null,
        preview: null,
        pendingOrder: null,
        draft: { ...EMPTY_DRAFT },
        loading: false,
      });
      void useOpsStore.getState().loadOrders();
      await get().refresh();
    } catch (error) {
      set({
        loading: false,
        error: apiMessage(error, 'No se pudo crear el despacho. Intenta de nuevo.'),
      });
    }
  },

  clearRoute: () =>
    set({ route: null, routeLegs: null, pickup: null, destination: null }),

  showRoute: () => {
    const dispatch = get().lastDispatch;
    if (!dispatch) return;
    set({
      route: dispatch.route.geometry,
      routeLegs: dispatch.legs,
      pickup: dispatch.pickup,
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
        pendingOrder: null,
        route: null,
        routeLegs: null,
        pickup: null,
        destination: null,
        destLabel: null,
        loading: false,
        notice: 'Servicio completado.',
      });
      void useOpsStore.getState().loadOrders();
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
        pendingOrder: null,
        route: null,
        routeLegs: null,
        pickup: null,
        destination: null,
        destLabel: null,
        loading: false,
        notice: 'Despacho cancelado y vehiculo liberado.',
      });
      void useOpsStore.getState().loadOrders();
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
        pendingOrder: null,
        route: null,
        routeLegs: null,
        pickup: null,
        destination: null,
        destLabel: null,
        notice: 'Servicio completado automaticamente.',
      });
    }
    // El despacho pudo cerrarse en el servidor: la orden vuelve a estar
    // al dia (completada o devuelta a la cola si se cancelo alla).
    void useOpsStore.getState().loadOrders();
  },
}));
