import { create } from 'zustand';

export interface MapControls {
  center: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface MapState {
  controls: MapControls | null;
  setControls: (controls: MapControls | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  controls: null,
  setControls: (controls) => set({ controls }),
}));

export const BASE_COORDINATE = { lat: -0.1807, lng: -78.4678 };
export const BASE_ZOOM = 13;
