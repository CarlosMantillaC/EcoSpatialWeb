import { FormEvent, useEffect, useState } from 'react';
import { driversApi, vehiclesApi } from '../../lib/api';
import { useFleetStore } from '../../store/fleet';
import type { Driver, DriverStatus } from '../../types';

const STATUS_STYLE: Record<DriverStatus, string> = {
  disponible:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  en_viaje: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  fuera: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

/** Plantilla de conductores y asignacion a vehiculos. */
export function DriversTab() {
  const vehicles = useFleetStore((state) => state.allVehicles);
  const refreshFleet = useFleetStore((state) => state.refresh);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', license: '', phone: '' });

  async function load() {
    setLoading(true);
    try {
      setDrivers(await driversApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await driversApi.create({
        name: form.name,
        license: form.license || undefined,
        phone: form.phone || undefined,
      });
      setForm({ name: '', license: '', phone: '' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError('No se pudo crear el conductor.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(driverId: string, vehicleId: string) {
    if (!vehicleId) return;
    try {
      await vehiclesApi.update(vehicleId, { driverId });
      await Promise.all([load(), refreshFleet()]);
    } catch {
      setError('No se pudo asignar el vehiculo.');
    }
  }

  async function handleStatus(driver: Driver, status: DriverStatus) {
    await driversApi.update(driver.id, { status });
    await load();
  }

  async function handleDelete(id: string) {
    await driversApi.remove(id);
    await Promise.all([load(), refreshFleet()]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {drivers.length} conductor(es)
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nuevo conductor'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
        >
          <input
            className={INPUT}
            placeholder="Nombre *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Licencia"
            value={form.license}
            onChange={(e) => setForm({ ...form, license: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear conductor'}
          </button>
        </form>
      )}

      {loading && drivers.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Cargando...</p>
      )}

      {drivers.map((driver) => {
        const assigned = vehicles.find(
          (vehicle) => vehicle.driverId === driver.id,
        );
        return (
          <div
            key={driver.id}
            className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          >
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {driver.name}
              </p>
              <span
                className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[driver.status]}`}
              >
                {driver.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {driver.license ?? 'Sin licencia'}
              {driver.phone ? ` · ${driver.phone}` : ''}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {assigned
                ? `Vehiculo: ${assigned.plate}`
                : 'Sin vehiculo asignado'}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              <select
                className={`${INPUT} flex-1`}
                value={assigned?.id ?? ''}
                onChange={(e) => void handleAssign(driver.id, e.target.value)}
              >
                <option value="">Asignar vehiculo...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  void handleStatus(
                    driver,
                    driver.status === 'fuera' ? 'disponible' : 'fuera',
                  )
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {driver.status === 'fuera' ? 'Activar' : 'Marcar fuera'}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(driver.id)}
                title="Eliminar conductor"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950/40"
              >
                X
              </button>
            </div>
          </div>
        );
      })}

      {!loading && drivers.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay conductores registrados.
        </p>
      )}
    </div>
  );
}
