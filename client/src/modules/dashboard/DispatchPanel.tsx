import { useFleetStore } from '../../store/fleet';

export function DispatchPanel() {
  const lastDispatch = useFleetStore((state) => state.lastDispatch);
  const destination = useFleetStore((state) => state.destination);
  const loading = useFleetStore((state) => state.loading);
  const completeLastDispatch = useFleetStore(
    (state) => state.completeLastDispatch,
  );
  const clearRoute = useFleetStore((state) => state.clearRoute);

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Despacho
      </h2>

      {!lastDispatch && !destination && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecciona un punto de entrega en el mapa. El sistema asignara el
          vehiculo disponible mas cercano y trazara la ruta con OSRM.
        </p>
      )}

      {lastDispatch && (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <p className="text-xs uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">
              Vehiculo asignado
            </p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
              {lastDispatch.vehicle.plate}
            </p>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
              {lastDispatch.vehicle.driverName ?? 'Sin conductor'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distancia
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {lastDispatch.route.distanceKm} km
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">ETA</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {lastDispatch.route.durationMin} min
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void completeLastDispatch()}
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Completar servicio
            </button>
            <button
              type="button"
              onClick={clearRoute}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Ocultar ruta
            </button>
          </div>
        </div>
      )}

      {!lastDispatch && destination && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Destino seleccionado: {destination.lat.toFixed(5)},{' '}
          {destination.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
