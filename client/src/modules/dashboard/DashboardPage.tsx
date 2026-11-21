import { useEffect, useState } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { MapView } from '../map/MapView';
import { VoiceControl } from '../voice/VoiceControl';
import { useFleetStore } from '../../store/fleet';
import { useFleetStream } from '../../lib/fleetStream';
import { usePickupStore } from '../../store/pickup';
import { DispatchPanel } from './DispatchPanel';
import { FleetPanel } from './FleetPanel';
import { OpsPanel } from './OpsPanel';

export function DashboardPage() {
  const loadVehicles = useFleetStore((state) => state.loadVehicles);
  const refresh = useFleetStore((state) => state.refresh);
  const loadPoints = usePickupStore((state) => state.loadPoints);
  // La operadora puede ocultar el panel izquierdo para ver mas mapa.
  const [sidePanelHidden, setSidePanelHidden] = useState(false);

  // Tiempo real via SSE (movimiento de flota y auto-completado).
  useFleetStream();

  useEffect(() => {
    void loadVehicles('all');
    // Sucursales para el flujo de despacho (sugerir/elegir recogida).
    void loadPoints();
    // Polling lento como respaldo por si el SSE se cae.
    const interval = window.setInterval(() => {
      void refresh();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [loadVehicles, refresh, loadPoints]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="absolute inset-0">
        <MapView />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <AppHeader />
      </div>

      {!sidePanelHidden && (
        <div className="pointer-events-none absolute left-3 top-20 z-20 flex max-h-[calc(100%-6rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col gap-3 overflow-y-auto pb-4 sm:left-4">
          <button
            type="button"
            onClick={() => setSidePanelHidden(true)}
            title="Ocultar el panel lateral izquierdo"
            className="pointer-events-auto flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 text-xs font-medium text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">&#8249;</span> Ocultar panel
          </button>
          <FleetPanel />
          <OpsPanel />
          <VoiceControl />
        </div>
      )}

      {sidePanelHidden && (
        <button
          type="button"
          onClick={() => setSidePanelHidden(false)}
          title="Mostrar el panel lateral izquierdo"
          className="pointer-events-auto absolute left-3 top-20 z-20 flex w-[calc(100%-1.5rem)] max-w-sm items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100 sm:left-4 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">&#8250;</span> Panel
        </button>
      )}

      <div className="pointer-events-none absolute right-3 top-20 z-20 w-[calc(100%-1.5rem)] max-w-sm sm:right-4 sm:w-full">
        <DispatchPanel />
      </div>
    </div>
  );
}
