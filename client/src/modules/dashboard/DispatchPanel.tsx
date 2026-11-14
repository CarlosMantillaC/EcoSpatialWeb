import { useFleetStore } from '../../store/fleet';

export function DispatchPanel() {
  const lastDispatch = useFleetStore((state) => state.lastDispatch);
  const preview = useFleetStore((state) => state.preview);
  const destination = useFleetStore((state) => state.destination);
  const loading = useFleetStore((state) => state.loading);
  const notice = useFleetStore((state) => state.notice);
  const error = useFleetStore((state) => state.error);
  const activeDispatches = useFleetStore((state) => state.activeDispatches);
  const routeVisible = useFleetStore(
    (state) => state.route !== null || state.preview !== null,
  );
  const approveDispatch = useFleetStore((state) => state.approveDispatch);
  const discardPreview = useFleetStore((state) => state.discardPreview);
  const completeLastDispatch = useFleetStore(
    (state) => state.completeLastDispatch,
  );
  const cancelLastDispatch = useFleetStore(
    (state) => state.cancelLastDispatch,
  );
  const clearRoute = useFleetStore((state) => state.clearRoute);
  const showRoute = useFleetStore((state) => state.showRoute);

  // Progreso en vivo del despacho activo (lo emite el SSE).
  const activeView = lastDispatch
    ? activeDispatches.find(
        (view) => view.dispatch.id === lastDispatch.dispatch.id,
      )
    : undefined;
  const progressPercent = activeView
    ? Math.round(activeView.progress * 100)
    : null;

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Despacho
      </h2>

      {notice && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {notice}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Estado 1: sin seleccion ni despacho */}
      {!lastDispatch && !preview && !destination && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecciona un punto de entrega en el mapa. El sistema calculara la
          ruta y el vehiculo mas cercano, y podras aprobar el viaje antes de
          asignarlo.
        </p>
      )}

      {/* Estado 2: vista previa pendiente de aprobacion */}
      {preview && !lastDispatch && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-xs uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
              Destino propuesto (sin aprobar)
            </p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
              {preview.destination.lat.toFixed(5)},{' '}
              {preview.destination.lng.toFixed(5)}
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
              {preview.vehicle.plate}
              {preview.vehicle.driverName
                ? ` · ${preview.vehicle.driverName}`
                : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distancia
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {preview.route.distanceKm} km
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">ETA</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {preview.route.durationMin} min
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void approveDispatch()}
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Asignando...' : 'Aprobar viaje'}
            </button>
            <button
              type="button"
              onClick={discardPreview}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Estado 3: despacho activo */}
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

          {progressPercent !== null && activeView && (
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
              <div className="flex items-baseline justify-between">
                <p className="text-xs uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
                  Viaje en curso
                </p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {activeView.remainingSec > 0
                    ? `Llegada en ~${activeView.remainingSec} s`
                    : 'Llegando...'}
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {progressPercent}%
                </span>
              </div>
            </div>
          )}

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
              onClick={() => void cancelLastDispatch()}
              disabled={loading}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Cancelar
            </button>
          </div>

          <button
            type="button"
            onClick={routeVisible ? clearRoute : showRoute}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {routeVisible ? 'Ocultar ruta' : 'Mostrar ruta'}
          </button>
        </div>
      )}
    </div>
  );
}
