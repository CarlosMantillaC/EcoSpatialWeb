import { create } from 'zustand';
import { ordersApi } from '../lib/api';
import type { ServiceOrder, ServiceOrderStatus } from '../types';

export type OpsTab = 'ordenes' | 'conductores' | 'reportes' | 'auditoria';

interface OpsState {
  /** Pestana visible del panel de operaciones. */
  tab: OpsTab;
  /** Ordenes de servicio (compartidas entre el panel y el flujo de despacho). */
  orders: ServiceOrder[];
  ordersLoading: boolean;
  setTab: (tab: OpsTab) => void;
  loadOrders: (status?: ServiceOrderStatus) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
}

export const useOpsStore = create<OpsState>((set, get) => ({
  tab: 'ordenes',
  orders: [],
  ordersLoading: false,

  setTab: (tab) => {
    set({ tab });
    if (tab === 'ordenes') void get().loadOrders();
  },

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
