import { FormEvent, useState } from 'react';
import { pickupPointsApi } from '../../lib/api';
import { usePickupStore } from '../../store/pickup';
import type { PickupPoint } from '../../types';
import { PickupPointMapPicker } from './PickupPointMapPicker';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const EMPTY_FORM = {
  name: '',
  address: '',
  lat: '7.889',
  lng: '-72.4967',
};

/**
 * Gestion de puntos de recogida (sucursales): alta y edicion. Nunca se
 * borran; se desactivan para conservar la trazabilidad de los viajes.
 */
export function PickupPointsTab() {
  const allPoints = usePickupStore((state) => state.allPoints);
  const loadPoints = usePickupStore((state) => state.loadPoints);

  const [editing, setEditing] = useState<PickupPoint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(point: PickupPoint) {
    setEditing(point);
    setForm({
      name: point.name,
      address: point.address ?? '',
      lat: String(point.lat),
      lng: String(point.lng),
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      address: form.address || undefined,
      lat: Number(form.lat),
      lng: Number(form.lng),
    };
    try {
      if (editing) {
        await pickupPointsApi.update(editing.id, payload);
      } else {
        await pickupPointsApi.create(payload);
      }
      await loadPoints();
      setShowForm(false);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo guardar el punto de recogida.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(point: PickupPoint) {
    setError(null);
    try {
      await pickupPointsApi.update(point.id, { active: !point.active });
      await loadPoints();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message) ? message.join(', ') : (message ?? 'Error.'),
      );
    }
  }

  const mapLat = Number(form.lat);
  const mapLng = Number(form.lng);
  // El mapa solo se monta con coordenadas validas (evita saltos a 0,0
  // mientras el administrador edita los campos numericos).
  const coordsValid =
    form.lat.trim() !== '' &&
    form.lng.trim() !== '' &&
    Number.isFinite(mapLat) &&
    Number.isFinite(mapLng);

  function handleCoords(lat: number, lng: number) {
    setForm((current) => ({
      ...current,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    }));
  }

  /** Completa la direccion solo si esta vacia (nunca pisa lo escrito). */
  function handleAddress(label: string) {
    setForm((current) => (current.address ? current : { ...current, address: label }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {allPoints.length} sucursal(es) · {allPoints.filter((p) => p.active).length}{' '}
          activas
        </p>
        <button
          type="button"
          onClick={showForm ? () => setShowForm(false) : openCreate}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nueva sucursal'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <input
            className={INPUT}
            placeholder="Nombre * (ej. Sucursal Centro)"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Direccion"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          {coordsValid && (
            <PickupPointMapPicker
              lat={mapLat}
              lng={mapLng}
              onCoords={handleCoords}
              onAddress={handleAddress}
            />
          )}
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
          <p className="text-[10px] text-slate-400">
            El punto debe quedar dentro del perimetro urbano de Cucuta.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving
              ? 'Guardando...'
              : editing
                ? 'Guardar cambios'
                : 'Crear sucursal'}
          </button>
        </form>
      )}

      <div className="space-y-1.5">
        {allPoints.map((point) => (
          <div
            key={point.id}
            className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {point.name}
                  {!point.active && (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      inactiva
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {point.address ?? 'Sin direccion'} · {point.lat.toFixed(5)},{' '}
                  {point.lng.toFixed(5)}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => openEdit(point)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(point)}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    point.active
                      ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {point.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {allPoints.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No hay sucursales registradas.
          </p>
        )}
      </div>
    </div>
  );
}
