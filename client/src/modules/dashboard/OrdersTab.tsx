import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ordersApi } from '../../lib/api';
import { useFleetStore } from '../../store/fleet';
import { useOpsStore } from '../../store/ops';
import type { ServiceOrder, ServiceOrderPriority } from '../../types';

const PRIORITY_STYLE: Record<ServiceOrderPriority, string> = {
  baja: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  alta: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
};

const STATUS_STYLE: Record<ServiceOrder['status'], string> = {
  pendiente:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  asignada:
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  completada:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelada:
    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

/** Cola de ordenes de servicio: alta, despacho y cancelacion. */
export function OrdersTab() {
  const orders = useOpsStore((state) => state.orders);
  const loading = useOpsStore((state) => state.ordersLoading);
  const loadOrders = useOpsStore((state) => state.loadOrders);
  const cancelOrder = useOpsStore((state) => state.cancelOrder);
  const removeOrder = useOpsStore((state) => state.removeOrder);
  const startOrderDispatch = useFleetStore(
    (state) => state.startOrderDispatch,
  );

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState({
    clientName: '',
    contact: '',
    destLabel: '',
    destLat: String(7.889),
    destLng: String(-72.4967),
    priority: 'media' as ServiceOrderPriority,
    notes: '',
  });

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await ordersApi.create({
        clientName: form.clientName,
        contact: form.contact || undefined,
        destLat: Number(form.destLat),
        destLng: Number(form.destLng),
        destLabel: form.destLabel || undefined,
        priority: form.priority,
        notes: form.notes || undefined,
      });
      setForm({ ...form, clientName: '', contact: '', destLabel: '', notes: '' });
      setShowForm(false);
      await loadOrders();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo crear la orden.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelOrder(id);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo cancelar la orden.'),
      );
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await removeOrder(id);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo eliminar la orden.'),
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {orders.length} orden(es)
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nueva orden'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <input
            className={INPUT}
            placeholder="Cliente *"
            required
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Contacto"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Destino (descripcion)"
            value={form.destLabel}
            onChange={(e) => setForm({ ...form, destLabel: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={INPUT}
              type="number"
              step="any"
              placeholder="Latitud *"
              required
              value={form.destLat}
              onChange={(e) => setForm({ ...form, destLat: e.target.value })}
            />
            <input
              className={INPUT}
              type="number"
              step="any"
              placeholder="Longitud *"
              required
              value={form.destLng}
              onChange={(e) => setForm({ ...form, destLng: e.target.value })}
            />
          </div>
          <select
            className={INPUT}
            value={form.priority}
            onChange={(e) =>
              setForm({
                ...form,
                priority: e.target.value as ServiceOrderPriority,
              })
            }
          >
            <option value="baja">Prioridad baja</option>
            <option value="media">Prioridad media</option>
            <option value="alta">Prioridad alta</option>
          </select>
          <textarea
            className={INPUT}
            placeholder="Notas"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear orden'}
          </button>
        </form>
      )}

      {loading && orders.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Cargando...</p>
      )}

      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[order.status]}`}
            >
              {order.status}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[order.priority]}`}
            >
              {order.priority}
            </span>
            <p className="ml-auto truncate text-xs text-slate-400">
              {new Date(order.createdAt).toLocaleDateString('es-CO')}
            </p>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {order.clientName}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {order.destLabel ?? `${order.destLat.toFixed(4)}, ${order.destLng.toFixed(4)}`}
          </p>

          {order.status === 'pendiente' && (
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => void startOrderDispatch(order)}
                className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Despachar
              </button>
              <button
                type="button"
                onClick={() => setOrderToCancel(order)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setOrderToDelete(order)}
                title="Eliminar orden"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950/40"
              >
                X
              </button>
            </div>
          )}
        </div>
      ))}

      {!loading && orders.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay ordenes registradas. Crea la primera con "Nueva orden".
        </p>
      )}

      <ConfirmDialog
        open={orderToCancel !== null}
        title="Cancelar orden"
        message={`¿Cancelar la orden de ${orderToCancel?.clientName}? Pasara a estado cancelada y ya no podra despacharse.`}
        confirmLabel="Si, cancelar"
        onCancel={() => setOrderToCancel(null)}
        onConfirm={() => {
          const order = orderToCancel;
          setOrderToCancel(null);
          if (order) void handleCancel(order.id);
        }}
      />

      <ConfirmDialog
        open={orderToDelete !== null}
        title="Eliminar orden"
        message={`¿Eliminar la orden de ${orderToDelete?.clientName}? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setOrderToDelete(null)}
        onConfirm={() => {
          const order = orderToDelete;
          setOrderToDelete(null);
          if (order) void handleRemove(order.id);
        }}
      />
    </div>
  );
}
