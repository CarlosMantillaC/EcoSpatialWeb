import { useEffect, useState } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { SearchInput } from '../../components/SearchInput';
import { matchesSearch } from '../../lib/search';
import { useFleetStore } from '../../store/fleet';
import { usePickupStore } from '../../store/pickup';
import { DriversTab } from '../dashboard/DriversTab';
import { NewVehicleForm } from '../dashboard/NewVehicleForm';
import { PickupPointsTab } from './PickupPointsTab';
import { UsersTab } from './UsersTab';

type AdminTab = 'sucursales' | 'vehiculos' | 'conductores' | 'usuarios';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'sucursales', label: 'Puntos de recogida' },
  { id: 'vehiculos', label: 'Vehiculos' },
  { id: 'conductores', label: 'Conductores' },
  { id: 'usuarios', label: 'Usuarios' },
];

function VehiclesTab() {
  const vehicles = useFleetStore((state) => state.allVehicles);
  const loadVehicles = useFleetStore((state) => state.loadVehicles);
  const [showForm, setShowForm] = useState(false);
  // Busqueda por placa, conductor o tipo de carga.
  const [query, setQuery] = useState('');

  useEffect(() => {
    void loadVehicles('all');
  }, [loadVehicles]);

  const visibleVehicles = vehicles.filter((vehicle) =>
    matchesSearch(
      query,
      vehicle.plate,
      vehicle.driverName,
      vehicle.cargoType,
      vehicle.status,
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {visibleVehicles.length} vehiculo(s)
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nuevo vehiculo'}
        </button>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar placa, conductor, carga..."
      />

      {showForm && (
        <NewVehicleForm
          onCreated={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
        {visibleVehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {vehicle.plate}
              </p>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {vehicle.cargoType}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conductor: {vehicle.driverName ?? 'Sin asignar'} · Estado:{' '}
              {vehicle.status}
            </p>
          </div>
        ))}
        {visibleVehicles.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {vehicles.length === 0
              ? 'Sin vehiculos registrados.'
              : 'Ningun vehiculo coincide con la busqueda.'}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Vista del administrador: gestion de maestros (sucursales, vehiculos,
 * conductores y usuarios). Sin mapa ni despachos: la operacion de viajes
 * es exclusiva de las operadoras.
 */
export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('sucursales');
  const loadPoints = usePickupStore((state) => state.loadPoints);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  return (
    <div className="min-h-full bg-slate-100 dark:bg-slate-950">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Consola de administracion: sucursales, flota, conductores y
          usuarios. Los despachos los operan las operadoras.
        </p>
        <div className="mb-4 flex flex-wrap gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {tab === 'sucursales' && <PickupPointsTab />}
          {tab === 'vehiculos' && <VehiclesTab />}
          {tab === 'conductores' && <DriversTab />}
          {tab === 'usuarios' && <UsersTab />}
        </div>
      </main>
    </div>
  );
}
