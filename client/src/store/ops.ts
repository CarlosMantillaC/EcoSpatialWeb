import { create } from 'zustand';
import { ordersApi } from '../lib/api';
import type { PickedPoint, ServiceOrder, ServiceOrderStatus } from '../types';

export type OpsTab = 'ordenes' | 'conductores' | 'reportes' | 'auditoria';

interface OpsState {
  /** Pestana visible del panel de operaciones. */
  tab: OpsTab;
  /** Ordenes de servicio (compartidas entre el panel y el flujo de despacho). */
  orders: ServiceOrder[];
  ordersLoading: boolean;
  /** Modo "Elegir en el mapa" del formulario de ordenes. */
  pickingOnMap: boolean;
  /** Ultimo punto elegido en el mapa (lo consume el formulario). */
  pickedPoint: PickedPoint | null;
  setTab: (tab: OpsTab) => void;
  setPickingOnMap: (picking: boolean) => void;
  setPickedPoint: (point: PickedPoint | null) => void;
  loadOrders: (status?: ServiceOrderStatus) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
}

export const useOpsStore = create<OpsState>((set, get) => ({
  tab: 'ordenes',
  orders: [],
  ordersLoading: false,
  pickingOnMap: false,
  pickedPoint: null,

  setTab: (tab) => {
    set({ tab });
    if (tab === 'ordenes') void get().loadOrders();
  },

  setPickingOnMap: (picking) => set({ pickingOnMap: picking }),

  setPickedPoint: (point) => set({ pickedPoint: point }),

  loadOrders: async (status) => {
    set({ ordersLoading: true });
    try {
      const orders = await ordersApi.list(status);
      set({ orders, ordersLoading: false });
    } catch {
      set({ ordersLoading: false });
    }
  },

  cancelOrder: async (id) => {
    await ordersApi.cancel(id);
    await get().loadOrders();
  },

  removeOrder: async (id) => {
    await ordersApi.remove(id);
    await get().loadOrders();
  },
}));
