import { create } from 'zustand';

export interface MapControls {
  center: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface MapState {
  controls: MapControls | null;
  setControls: (controls: MapControls | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  controls: null,
  setControls: (controls) => set({ controls }),
}));

export const BASE_COORDINATE = { lat: 7.889, lng: -72.4967 };
export const BASE_ZOOM = 13;
