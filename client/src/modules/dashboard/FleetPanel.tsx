import { useEffect, useRef, useState } from 'react';
import { useFleetStore, type FleetFilter } from '../../store/fleet';
import { useMapStore } from '../../store/map';
import { useAuthStore } from '../../store/auth';
import { SearchInput } from '../../components/SearchInput';
import { matchesSearch } from '../../lib/search';
import type { ActiveDispatch, Vehicle } from '../../types';
import { NewVehicleForm } from './NewVehicleForm';

const FILTERS: { id: FleetFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'sin_conductor', label: 'Libres' },
  { id: 'libre', label: 'Disponibles' },
  { id: 'en_ruta', label: 'En ruta' },
  { id: 'no_disponible', label: 'No disp.' },
];

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'llegando';
  if (seconds < 60) return `${seconds} s`;
  return `${Math.ceil(seconds / 60)} min`;
}

function StatusPill({ status }: { status: Vehicle['status'] }) {
  const styles: Record<Vehicle['status'], string> = {
    libre:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    en_ruta:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    no_disponible:
      'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    sin_conductor:
      'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  };
  const labels: Record<Vehicle['status'], string> = {
    libre: 'Disponible',
    en_ruta: 'En ruta',
    no_disponible: 'No disponible',
    sin_conductor: 'Libre',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function OnRouteRow({ view }: { view: ActiveDispatch }) {
  const flyTo = useMapStore((state) => state.controls?.flyTo);
  const percent = Math.round(view.progress * 100);

  return (
    <button
      type="button"
      onClick={() => flyTo?.(view.vehicle.lat, view.vehicle.lng)}
      title="Centrar el mapa en este vehiculo"
      className="w-full rounded-xl bg-amber-50 p-2 text-left transition hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold text-amber-900 dark:text-amber-200">
          {view.vehicle.plate}
        </p>
        <p className="shrink-0 text-xs text-amber-700/80 dark:text-amber-400/80">
          {formatRemaining(view.remainingSec)}
        </p>
      </div>
      <p className="truncate text-xs text-amber-800/70 dark:text-amber-300/70">
        {view.vehicle.driverName ?? 'Sin conductor'} ·{' '}
        {view.destination.lat.toFixed(4)}, {view.destination.lng.toFixed(4)}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
          <div
            className="h-1.5 rounded-full bg-amber-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
          {percent}%
        </span>
      </div>
    </button>
  );
}

function VehicleRow({
  vehicle,
  activeDispatch,
}: {
  vehicle: Vehicle;
  activeDispatch?: ActiveDispatch;
}) {
  const selectedVehicleId = useFleetStore((state) => state.selectedVehicleId);
  const selectVehicle = useFleetStore((state) => state.selectVehicle);
  const flyTo = useMapStore((state) => state.controls?.flyTo);
  const rowRef = useRef<HTMLButtonElement | null>(null);
  const selected = selectedVehicleId === vehicle.id;

  // Cuando la seleccion viene del mapa, la fila se desplaza a la vista.
  useEffect(() => {
    if (selected) {
      rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => {
        // Click sobre la fila ya seleccionada: quita la seleccion.
        if (selected) {
          selectVehicle(null);
          return;
        }
        selectVehicle(vehicle.id);
        flyTo?.(vehicle.lat, vehicle.lng, 16);
      }}
      title={
        selected
          ? 'Quitar la seleccion de este vehiculo'
          : 'Ver este vehiculo en el mapa'
      }
      className={`w-full rounded-xl border p-2 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {vehicle.plate}
        </p>
        <StatusPill status={vehicle.status} />
      </div>
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
        {vehicle.driverName ?? 'Sin conductor'} ·{' '}
        {vehicle.cargoType ?? 'general'}
      </p>
      {activeDispatch ? (
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.round(activeDispatch.progress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
            {formatRemaining(activeDispatch.remainingSec)}
          </span>
        </div>
      ) : (
        <p className="mt-1 truncate text-[10px] text-slate-400 dark:text-slate-500">
          {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
        </p>
      )}
    </button>
  );
}

export function FleetPanel() {
  const stats = useFleetStore((state) => state.stats);
  const filter = useFleetStore((state) => state.filter);
  const loading = useFleetStore((state) => state.loading);
  const error = useFleetStore((state) => state.error);
  const notice = useFleetStore((state) => state.notice);
  const vehicles = useFleetStore((state) => state.vehicles);
  const activeDispatches = useFleetStore((state) => state.activeDispatches);
  const setFilter = useFleetStore((state) => state.setFilter);
  const refresh = useFleetStore((state) => state.refresh);
  const role = useAuthStore((state) => state.user?.role);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Busqueda por placa, conductor, tipo de carga o estado.
  const [query, setQuery] = useState('');

  // Alta de vehiculos: solo el administrador (gestion de maestros).
  const isAdmin = role === 'admin';

  const dispatchByVehicle = new Map(
    activeDispatches.map((view) => [view.vehicle.id, view]),
  );

  const visibleVehicles = vehicles.filter((vehicle) =>
    matchesSearch(
      query,
      vehicle.plate,
      vehicle.driverName,
      vehicle.cargoType,
      vehicle.status,
    ),
  );

  const visibleDispatches = activeDispatches.filter((view) =>
    matchesSearch(query, view.vehicle.plate, view.vehicle.driverName),
  );

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Flota
        </h2>
        <div className="flex gap-1.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {showCreateForm ? 'Cerrar' : 'Nuevo vehiculo'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Refrescar
          </button>
        </div>
      </div>

      {isAdmin && showCreateForm && (
        <div className="mb-3">
          <NewVehicleForm
            onCreated={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="mb-3 grid grid-cols-5 gap-1">
        <div className="rounded-xl bg-slate-100 p-1.5 text-center dark:bg-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-[9px] uppercase text-slate-500 dark:text-slate-400">
            Total
          </p>
        </div>
        <div className="rounded-xl bg-violet-50 p-1.5 text-center dark:bg-violet-950/40">
          <p className="text-sm font-bold text-violet-700 dark:text-violet-400">
            {stats.sin_conductor}
          </p>
          <p className="text-[9px] uppercase text-violet-700/80 dark:text-violet-400/80">
            Libres
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-1.5 text-center dark:bg-emerald-950/40">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {stats.libre}
          </p>
          <p className="text-[9px] uppercase text-emerald-700/80 dark:text-emerald-400/80">
            Disp.
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-1.5 text-center dark:bg-amber-950/40">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
            {stats.en_ruta}
          </p>
          <p className="text-[9px] uppercase text-amber-700/80 dark:text-amber-400/80">
            En ruta
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 p-1.5 text-center dark:bg-slate-800">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {stats.no_disponible}
          </p>
          <p className="text-[9px] uppercase text-slate-500 dark:text-slate-400">
            No disp.
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
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

      <div className="mt-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar placa, conductor, carga..."
        />
      </div>

      {visibleDispatches.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            En ruta · con despacho
          </p>
          <div className="space-y-1.5">
            {visibleDispatches.map((view) => (
              <OnRouteRow key={view.dispatch.id} view={view} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Vehiculos · {visibleVehicles.length}
        </p>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {visibleVehicles.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
              {vehicles.length === 0
                ? 'Sin vehiculos con este filtro.'
                : 'Sin coincidencias para la busqueda.'}
            </p>
          )}
          {visibleVehicles.map((vehicle) => (
            <VehicleRow
              key={vehicle.id}
              vehicle={vehicle}
              activeDispatch={dispatchByVehicle.get(vehicle.id)}
            />
          ))}
        </div>
      </div>

      {notice && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Haz clic en un vehiculo para verlo en el mapa, o en el mapa para elegir
        el destino y aprobar el viaje.
      </p>
    </div>
  );
}
