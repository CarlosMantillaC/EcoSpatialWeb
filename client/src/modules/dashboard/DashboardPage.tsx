import { useEffect } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { MapView } from '../map/MapView';
import { VoiceControl } from '../voice/VoiceControl';
import { useFleetStore } from '../../store/fleet';
import { DispatchPanel } from './DispatchPanel';
import { FleetPanel } from './FleetPanel';

export function DashboardPage() {
  const loadVehicles = useFleetStore((state) => state.loadVehicles);
  const refresh = useFleetStore((state) => state.refresh);

  useEffect(() => {
    void loadVehicles('all');
    const interval = window.setInterval(() => {
      void refresh();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [loadVehicles, refresh]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="absolute inset-0">
        <MapView />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <AppHeader />
      </div>

      <div className="pointer-events-none absolute left-3 top-20 z-20 flex max-h-[calc(100%-6rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col gap-3 overflow-y-auto pb-4 sm:left-4">
        <FleetPanel />
        <VoiceControl />
      </div>

      <div className="pointer-events-none absolute right-3 top-20 z-20 w-[calc(100%-1.5rem)] max-w-sm sm:right-4 sm:w-full">
        <DispatchPanel />
      </div>
    </div>
  );
}
