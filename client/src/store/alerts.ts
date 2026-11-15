import { create } from 'zustand';
import { alertsApi } from '../lib/api';
import type { FleetAlert } from '../types';

interface AlertsState {
  /** Historial reciente de alertas (mas recientes primero). */
  alerts: FleetAlert[];
  /** Contador de alertas sin leer (campana del header). */
  unread: number;
  open: boolean;
  loading: boolean;
  load: () => Promise<void>;
  /** Llega una alerta nueva por SSE: se prepende y suma al contador. */
  addAlert: (alert: FleetAlert) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setOpen: (open: boolean) => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  unread: 0,
  open: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const alerts = await alertsApi.list();
      set({
        alerts,
        unread: alerts.filter((alert) => !alert.readAt).length,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  addAlert: (alert) => {
    const { alerts, unread } = get();
    // Defensa contra duplicados por reconexion del SSE.
    if (alerts.some((existing) => existing.id === alert.id)) return;
    set({
      alerts: [alert, ...alerts].slice(0, 100),
      unread: unread + (alert.readAt ? 0 : 1),
    });
  },

  markRead: async (id) => {
    const { alerts } = get();
    const target = alerts.find((alert) => alert.id === id);
    if (!target || target.readAt) return;
    set({
      alerts: alerts.map((alert) =>
        alert.id === id ? { ...alert, readAt: new Date().toISOString() } : alert,
      ),
      unread: Math.max(0, get().unread - 1),
    });
    try {
      await alertsApi.markRead(id);
    } catch {
      /* el estado local ya quedo; el servidor se pone al dia en el reload */
    }
  },

  markAllRead: async () => {
    set({
      alerts: get().alerts.map((alert) =>
        alert.readAt ? alert : { ...alert, readAt: new Date().toISOString() },
      ),
      unread: 0,
    });
    try {
      await alertsApi.markAllRead();
    } catch {
      /* igual que arriba */
    }
  },

  setOpen: (open) => set({ open }),
}));
