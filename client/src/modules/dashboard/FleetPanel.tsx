import { useFleetStore, type FleetFilter } from '../../store/fleet';

const FILTERS: { id: FleetFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'libre', label: 'Disponibles' },
  { id: 'en_ruta', label: 'En ruta' },
];

export function FleetPanel() {
  const stats = useFleetStore((state) => state.stats);
  const filter = useFleetStore((state) => state.filter);
  const loading = useFleetStore((state) => state.loading);
  const error = useFleetStore((state) => state.error);
  const setFilter = useFleetStore((state) => state.setFilter);
  const refresh = useFleetStore((state) => state.refresh);

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Flota
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Refrescar
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-100 p-2 text-center dark:bg-slate-800">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">
            Total
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-2 text-center dark:bg-emerald-950/40">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {stats.libre}
          </p>
          <p className="text-[11px] uppercase text-emerald-700/80 dark:text-emerald-400/80">
            Libres
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-2 text-center dark:bg-amber-950/40">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {stats.en_ruta}
          </p>
          <p className="text-[11px] uppercase text-amber-700/80 dark:text-amber-400/80">
            En ruta
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void setFilter(item.id)}
            disabled={loading}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              filter === item.id
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Haz clic en el mapa para despachar la unidad mas cercana.
      </p>
    </div>
  );
}
