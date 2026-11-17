import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useFleetStore } from '../../store/fleet';
import { usePickupStore } from '../../store/pickup';
import { CARGO_LABELS, CARGO_TYPES, type DispatchPhase } from '../../types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const PHASE_LABEL: Record<DispatchPhase, string> = {
  to_pickup: 'Yendo a recoger',
  loading: 'Cargando en sucursal',
  to_delivery: 'En reparto',
};

const PHASE_STYLE: Record<DispatchPhase, string> = {
  to_pickup:
    'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  loading:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  to_delivery:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
};

export function DispatchPanel() {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const lastDispatch = useFleetStore((state) => state.lastDispatch);
  const preview = useFleetStore((state) => state.preview);
  const pendingOrder = useFleetStore((state) => state.pendingOrder);
  const destination = useFleetStore((state) => state.destination);
  const destLabel = useFleetStore((state) => state.destLabel);
  const draft = useFleetStore((state) => state.draft);
  const loading = useFleetStore((state) => state.loading);
  const notice = useFleetStore((state) => state.notice);
  const error = useFleetStore((state) => state.error);
  const activeDispatches = useFleetStore((state) => state.activeDispatches);
  const routeVisible = useFleetStore(
    (state) => state.route !== null || state.preview !== null,
  );
  const setDraft = useFleetStore((state) => state.setDraft);
  const changePickup = useFleetStore((state) => state.changePickup);
  const runPreview = useFleetStore((state) => state.runPreview);
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

  const pickupPoints = usePickupStore((state) => state.points);
  const loadPoints = usePickupStore((state) => state.loadPoints);
  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  // Progreso en vivo del despacho activo (lo emite el SSE).
  const activeView = lastDispatch
    ? activeDispatches.find(
        (view) => view.dispatch.id === lastDispatch.dispatch.id,
      )
    : undefined;
  const progressPercent = activeView
    ? Math.round(activeView.progress * 100)
    : null;

  // Sin despacho, destino, preview ni avisos: la tarjeta no se muestra.
  const hasContent = Boolean(
    lastDispatch || preview || destination || notice || error,
  );
  if (!hasContent) return null;

  const destinationText = destination
    ? `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`
    : '';

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

      {/* Estado 1: destino elegido, formulario del envio */}
      {destination && !preview && !lastDispatch && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void runPreview();
          }}
        >
          <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entrega en
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {pendingOrder?.clientName
                ? `${pendingOrder.clientName} · `
                : ''}
              {destLabel ??
                `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`}
            </p>
          </div>

          <input
            className={INPUT}
            placeholder="Producto / contenido * (ej. Insulina NPH 100UI)"
            required
            value={draft.productLabel}
            onChange={(e) => setDraft({ productLabel: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={INPUT}
              type="number"
              min={1}
              placeholder="Cantidad"
              value={draft.quantity ?? ''}
              onChange={(e) =>
                setDraft({
                  quantity: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <select
              className={INPUT}
              value={draft.cargoType}
              onChange={(e) =>
                setDraft({ cargoType: e.target.value as typeof draft.cargoType })
              }
            >
              {CARGO_TYPES.map((type) => (
                <option key={type} value={type}>
                  Carga: {CARGO_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <select
            className={INPUT}
            value={draft.pickupPointId ?? ''}
            onChange={(e) => void changePickup(e.target.value || null)}
          >
            <option value="">Recogida: sugerir la mas conveniente</option>
            {pickupPoints.map((point) => (
              <option key={point.id} value={point.id}>
                Recoger en: {point.name}
              </option>
            ))}
          </select>
          {pickupPoints.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              No hay puntos de recogida activos; el administrador debe crear
              sucursales.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || pickupPoints.length === 0}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Calcular viaje'}
            </button>
            <button
              type="button"
              onClick={discardPreview}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Estado 2: vista previa pendiente de aprobacion */}
      {preview && !lastDispatch && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-xs uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
              {pendingOrder ? 'Orden de servicio (sin aprobar)' : 'Envio propuesto (sin aprobar)'}
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
              {preview.productLabel}
              {preview.quantity ? ` × ${preview.quantity}` : ''}
              <span className="ml-1 rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/70 dark:text-amber-200">
                {CARGO_LABELS[preview.cargoType]}
              </span>
            </p>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
              Recoger en: {preview.pickup.name}
              {preview.pickup.suggested && (
                <span className="ml-1 rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/70 dark:text-amber-200">
                  sugerido
                </span>
              )}
            </p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
              Entregar en: {destLabel ?? destinationText}
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
              {preview.vehicle.plate}
              {preview.vehicle.driverName
                ? ` · ${preview.vehicle.driverName}`
                : ''}
            </p>
          </div>

          <div className="flex gap-1.5">
            <select
              className={INPUT}
              value={draft.pickupPointId ?? ''}
              onChange={(e) => void changePickup(e.target.value || null)}
            >
              {pickupPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  Recoger en: {point.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A recoger
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {preview.legs[0].distanceKm} km · {preview.legs[0].durationMin}{' '}
                min
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A entregar
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {preview.legs[1].distanceKm} km · {preview.legs[1].durationMin}{' '}
                min
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Distancia total
              </p>
              <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                {preview.route.distanceKm} km
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                ETA total
              </p>
              <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
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
            <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {lastDispatch.productLabel}
              {lastDispatch.quantity ? ` × ${lastDispatch.quantity}` : ''}
              <span className="ml-1 rounded-full bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200">
                {CARGO_LABELS[lastDispatch.cargoType]}
              </span>
            </p>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
              {lastDispatch.pickup.name} → {lastDispatch.dispatch.destLabel ??
                `${lastDispatch.dispatch.destLat.toFixed(5)}, ${lastDispatch.dispatch.destLng.toFixed(5)}`}
            </p>
          </div>

          {activeView && (
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${PHASE_STYLE[activeView.phase]}`}
              >
                {PHASE_LABEL[activeView.phase]}
              </span>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {activeView.remainingSec > 0
                  ? `Llegada en ~${activeView.remainingSec} s`
                  : 'Llegando...'}
              </p>
            </div>
          )}

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

          {progressPercent !== null && (
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
              <div className="flex items-baseline justify-between">
                <p className="text-xs uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
                  Viaje en curso
                </p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {progressPercent}%
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
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
              onClick={() => setConfirmCancel(true)}
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

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar despacho"
        message="¿Cancelar el viaje en curso? El vehiculo quedara liberado y el servicio no se completara."
        confirmLabel="Si, cancelar"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void cancelLastDispatch();
        }}
      />
    </div>
  );
}
