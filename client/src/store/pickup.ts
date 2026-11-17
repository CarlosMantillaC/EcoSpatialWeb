import { create } from 'zustand';
import { pickupPointsApi } from '../lib/api';
import type { PickupPoint } from '../types';

interface PickupState {
  /** Puntos de recogida (sucursales) activos: los usa el flujo de despacho. */
  points: PickupPoint[];
  /** Incluye inactivos (gestion del administrador). */
  allPoints: PickupPoint[];
  loading: boolean;
  loadPoints: () => Promise<void>;
}

/**
 * Catalogo de sucursales compartido por el flujo de despacho (elegir /
 * sugerir recogida), el formulario de ordenes y la gestion del admin.
 */
export const usePickupStore = create<PickupState>((set) => ({
  points: [],
  allPoints: [],
  loading: false,
  loadPoints: async () => {
    set({ loading: true });
    try {
      const allPoints = await pickupPointsApi.list();
      set({
        allPoints,
        points: allPoints.filter((point) => point.active),
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));
