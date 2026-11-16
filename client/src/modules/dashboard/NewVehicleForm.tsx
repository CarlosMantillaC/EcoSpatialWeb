import { FormEvent, useEffect, useState } from 'react';
import { driversApi, vehiclesApi } from '../../lib/api';
import { useFleetStore } from '../../store/fleet';
import type { Driver } from '../../types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const CENTER_LAT = '7.889';
const CENTER_LNG = '-72.4967';

/**
 * Alta de vehiculos desde el panel Flota. Sin conductor el vehiculo queda
 * Libre ("sin_conductor") y se le puede asignar uno desde Conductores.
 */
export function NewVehicleForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const vehicles = useFleetStore((state) => state.allVehicles);
  const refreshFleet = useFleetStore((state) => state.refresh);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    plate: '',
    cargoType: '',
    lat: CENTER_LAT,
    lng: CENTER_LNG,
    driverId: '',
  });

  useEffect(() => {
    void driversApi
      .list()
      .then(setDrivers)
      .catch(() => setDrivers([]));
  }, []);

  // Regla 1:1 — solo conductores sin vehiculo pueden asignarse.
  const freeDrivers = drivers.filter(
    (driver) => !vehicles.some((vehicle) => vehicle.driverId === driver.id),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await vehiclesApi.create({
        plate: form.plate,
        cargoType: form.cargoType || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        driverId: form.driverId || undefined,
      });
      await refreshFleet();
      onCreated();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo crear el vehiculo.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
    >
      <input
        className={INPUT}
        placeholder="Placa *"
        required
        value={form.plate}
        onChange={(e) => setForm({ ...form, plate: e.target.value })}
      />
      <input
        className={INPUT}
        placeholder="Tipo de carga (general, refrigerado...)"
        value={form.cargoType}
        onChange={(e) => setForm({ ...form, cargoType: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className={INPUT}
          type="number"
          step="any"
          placeholder="Latitud *"
          required
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
        />
        <input
          className={INPUT}
          type="number"
          step="any"
          placeholder="Longitud *"
          required
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
        />
      </div>
      <select
        className={INPUT}
        value={form.driverId}
        onChange={(e) => setForm({ ...form, driverId: e.target.value })}
      >
        <option value="">Sin conductor (queda Libre)</option>
        {freeDrivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Crear vehiculo'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
