import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchInput } from '../../components/SearchInput';
import { driversApi, vehiclesApi } from '../../lib/api';
import { matchesSearch } from '../../lib/search';
import { useFleetStore } from '../../store/fleet';
import type { Driver, DriverStatus } from '../../types';

const STATUS_STYLE: Record<DriverStatus, string> = {
  disponible:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  en_viaje: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  fuera: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_LABEL: Record<DriverStatus, string> = {
  disponible: 'Disponible',
  en_viaje: 'En viaje',
  fuera: 'No disponible',
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
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [driverToDisable, setDriverToDisable] = useState<Driver | null>(null);
  // Busqueda por nombre, licencia, telefono o placa asignada.
  const [query, setQuery] = useState('');
  // Error de asignacion por tarjeta de conductor.
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
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

  async function handleAssign(driver: Driver, value: string) {
    if (!value) return;
    setError(null);
    setAssignErrors((prev) => ({ ...prev, [driver.id]: '' }));
    const assigned = vehicles.find((vehicle) => vehicle.driverId === driver.id);
    try {
      if (value === 'none') {
        if (assigned) {
          await vehiclesApi.update(assigned.id, { driverId: null });
        }
      } else {
        // Cambio en un paso: si ya tenia vehiculo, se desasigna primero.
        if (assigned && assigned.id !== value) {
          await vehiclesApi.update(assigned.id, { driverId: null });
        }
        await vehiclesApi.update(value, { driverId: driver.id });
      }
      await Promise.all([load(), refreshFleet()]);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setAssignErrors((prev) => ({
        ...prev,
        [driver.id]: Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo asignar el vehiculo.'),
      }));
    }
  }

  async function handleStatus(driver: Driver, status: DriverStatus) {    await driversApi.update(driver.id, { status });
    // La disponibilidad del conductor cambia la de sus vehiculos:
    // la flota se refresca de inmediato.
    await Promise.all([load(), refreshFleet()]);
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await driversApi.remove(id);
      await Promise.all([load(), refreshFleet()]);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo eliminar el conductor.'),
      );
    }
  }

  const visibleDrivers = drivers.filter((driver) => {
    const assigned = vehicles.find(
      (vehicle) => vehicle.driverId === driver.id,
    );
    return matchesSearch(
      query,
      driver.name,
      driver.license,
      driver.phone,
      driver.status,
      assigned?.plate,
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {visibleDrivers.length} conductor(es)
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nuevo conductor'}
        </button>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar nombre, licencia, placa..."
      />

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

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

      {visibleDrivers.map((driver) => {
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
                {STATUS_LABEL[driver.status]}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {driver.license ?? 'Sin licencia'}
              {driver.phone ? ` · ${driver.phone}` : ''}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {assigned
                ? `Vehiculo: ${assigned.plate} · ${
                    assigned.status === 'libre'
                      ? 'Disponible'
                      : assigned.status === 'en_ruta'
                        ? 'En ruta'
                        : assigned.status === 'no_disponible'
                          ? 'No disponible'
                          : 'Libre'
                  }`
                : 'Sin vehiculo asignado'}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              <select
                className={`${INPUT} flex-1`}
                value={assigned?.id ?? ''}
                onChange={(e) => void handleAssign(driver, e.target.value)}
                title="Un conductor solo puede conducir un vehiculo a la vez"
              >
                <option value="" disabled>
                  {assigned ? 'Cambiar vehiculo...' : 'Asignar vehiculo...'}
                </option>
                {assigned && <option value="none">Sin asignar</option>}
                {assigned && (
                  <option value={assigned.id}>{assigned.plate} (actual)</option>
                )}
                {vehicles
                  .filter((vehicle) => vehicle.status === 'sin_conductor')
                  .map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  driver.status === 'fuera'
                    ? void handleStatus(driver, 'disponible')
                    : setDriverToDisable(driver)
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {driver.status === 'fuera'
                  ? 'Marcar disponible'
                  : 'Marcar no disponible'}
              </button>
              <button
                type="button"
                onClick={() => setDriverToDelete(driver)}
                title="Eliminar conductor"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950/40"
              >
                X
              </button>
            </div>

            {assignErrors[driver.id] && (
              <p className="mt-1.5 rounded-lg bg-red-50 p-1.5 text-[10px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {assignErrors[driver.id]}
              </p>
            )}
          </div>
        );
      })}

      {!loading && drivers.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay conductores registrados.
        </p>
      )}

      {!loading && drivers.length > 0 && visibleDrivers.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ningun conductor coincide con la busqueda.
        </p>
      )}

      <ConfirmDialog
        open={driverToDisable !== null}
        title="Marcar no disponible"
        message={`¿Marcar a ${driverToDisable?.name} como no disponible? Sus vehiculos saldran de servicio y no recibiran nuevos despachos hasta reactivarlo.`}
        confirmLabel="Si, marcar"
        onCancel={() => setDriverToDisable(null)}
        onConfirm={() => {
          const driver = driverToDisable;
          setDriverToDisable(null);
          if (driver) void handleStatus(driver, 'fuera');
        }}
      />

      <ConfirmDialog
        open={driverToDelete !== null}
        title="Eliminar conductor"
        message={`¿Eliminar a ${driverToDelete?.name}? Sus vehiculos quedaran sin conductor y disponibles.`}
        confirmLabel="Eliminar"
        onCancel={() => setDriverToDelete(null)}
        onConfirm={() => {
          const driver = driverToDelete;
          setDriverToDelete(null);
          if (driver) void handleDelete(driver.id);
        }}
      />
    </div>
  );
}
