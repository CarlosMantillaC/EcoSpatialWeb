import { FormEvent, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchInput } from '../../components/SearchInput';
import { geocodeApi, ordersApi } from '../../lib/api';
import { matchesSearch } from '../../lib/search';
import { useFleetStore } from '../../store/fleet';
import { useOpsStore } from '../../store/ops';
import { usePickupStore } from '../../store/pickup';
import {
  CARGO_LABELS,
  CARGO_TYPES,
  type CargoType,
  type GeocodeSuggestion,
  type ServiceOrder,
  type ServiceOrderPriority,
} from '../../types';

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

/** "lat, lng" escrito directamente en el campo de destino. */
const COORD_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/** Aproximacion del area de Cucuta para avisar antes de enviar. */
const CUCUTA_BOUNDS = {
  minLat: 7.845,
  maxLat: 7.935,
  minLng: -72.56,
  maxLng: -72.43,
};

/** Nombre corto para el campo de destino (Nominatim devuelve direcciones largas). */
function shortLabel(label: string): string {
  return label
    .split(',')
    .slice(0, 2)
    .map((part) => part.trim())
    .join(', ');
}

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
  const pickingOnMap = useOpsStore((state) => state.pickingOnMap);
  const pickedPoint = useOpsStore((state) => state.pickedPoint);
  const setPickingOnMap = useOpsStore((state) => state.setPickingOnMap);
  const setPickedPoint = useOpsStore((state) => state.setPickedPoint);
  const pickupPoints = usePickupStore((state) => state.points);
  const loadPoints = usePickupStore((state) => state.loadPoints);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Busqueda por cliente, producto, destino, sucursal o estado.
  const [query, setQuery] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<ServiceOrder | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  // Evita re-buscar cuando el destino se llena programaticamente.
  const skipSearch = useRef(false);
  const [form, setForm] = useState({
    clientName: '',
    contact: '',
    destLabel: '',
    destLat: String(7.889),
    destLng: String(-72.4967),
    pickupPointId: '',
    cargoType: 'general' as CargoType,
    productLabel: '',
    quantity: '',
    priority: 'media' as ServiceOrderPriority,
    notes: '',
  });

  useEffect(() => {
    void loadOrders();
    void loadPoints();
  }, [loadOrders, loadPoints]);

  // Sugiere la sucursal mas cercana al destino mientras no se elija otra.
  useEffect(() => {
    if (form.pickupPointId || pickupPoints.length === 0) return;
    const lat = Number(form.destLat);
    const lng = Number(form.destLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const nearest = pickupPoints.reduce((best, point) => {
      const distance = (point.lat - lat) ** 2 + (point.lng - lng) ** 2;
      const bestDistance = (best.lat - lat) ** 2 + (best.lng - lng) ** 2;
      return distance < bestDistance ? point : best;
    });
    setForm((current) => ({ ...current, pickupPointId: nearest.id }));
    // Solo al abrir el formulario o al cambiar la sucursal disponible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupPoints]);

  // Busqueda por nombre con debounce; "lat, lng" se toma como coordenada.
  useEffect(() => {
    const text = form.destLabel.trim();
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (text.length < 3 || COORD_PATTERN.test(text)) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      geocodeApi
        .search(text)
        .then((results) => setSuggestions(results))
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.destLabel]);

  // El clic en el mapa (modo "Elegir en el mapa") llena el formulario.
  useEffect(() => {
    if (!pickedPoint) return;
    skipSearch.current = true;
    setSuggestions([]);
    setForm((current) => ({
      ...current,
      destLabel: pickedPoint.label
        ? shortLabel(pickedPoint.label)
        : current.destLabel,
      destLat: String(pickedPoint.lat),
      destLng: String(pickedPoint.lng),
    }));
    setPickingOnMap(false);
    // El punto se mantiene visible en el mapa hasta cerrar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedPoint]);

  // Al irse de la pestana no queda un modo seleccion colgado.
  useEffect(
    () => () => {
      useOpsStore.getState().setPickingOnMap(false);
      useOpsStore.getState().setPickedPoint(null);
    },
    [],
  );

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
        pickupPointId: form.pickupPointId,
        cargoType: form.cargoType,
        productLabel: form.productLabel,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        priority: form.priority,
        notes: form.notes || undefined,
      });
      setForm({
        ...form,
        clientName: '',
        contact: '',
        destLabel: '',
        productLabel: '',
        quantity: '',
        pickupPointId: '',
      });
      closeForm();
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

  /** Elige una sugerencia de busqueda: nombre + coordenadas. */
  function pickSuggestion(suggestion: GeocodeSuggestion) {
    skipSearch.current = true;
    setSuggestions([]);
    setForm((current) => ({
      ...current,
      destLabel: shortLabel(suggestion.label),
      destLat: String(suggestion.lat),
      destLng: String(suggestion.lng),
    }));
  }

  function toggleForm() {
    if (showForm) closeForm();
    else setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setSuggestions([]);
    setPickingOnMap(false);
    setPickedPoint(null);
  }

  const latNum = Number(form.destLat);
  const lngNum = Number(form.destLng);
  const outsideCucuta =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    (latNum < CUCUTA_BOUNDS.minLat ||
      latNum > CUCUTA_BOUNDS.maxLat ||
      lngNum < CUCUTA_BOUNDS.minLng ||
      lngNum > CUCUTA_BOUNDS.maxLng);

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

  const pickupName = (order: ServiceOrder) =>
    pickupPoints.find((point) => point.id === order.pickupPointId)?.name;

  const visibleOrders = orders.filter((order) =>
    matchesSearch(
      query,
      order.clientName,
      order.contact,
      order.productLabel,
      order.destLabel,
      pickupName(order),
      order.status,
      order.priority,
      order.notes,
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {visibleOrders.length} orden(es)
        </p>
        <button
          type="button"
          onClick={toggleForm}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nueva orden'}
        </button>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar cliente, producto, destino..."
      />

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
          <div className="relative">
            <input
              className={INPUT}
              placeholder="Destino: busca por nombre o escribe 'lat, lng'"
              value={form.destLabel}
              onChange={(e) => {
                const value = e.target.value;
                const coords = value.match(COORD_PATTERN);
                if (coords) {
                  // Coordenadas directas: sin geocodificar.
                  skipSearch.current = true;
                  setSuggestions([]);
                  setForm((current) => ({
                    ...current,
                    destLabel: value,
                    destLat: coords[1],
                    destLng: coords[2],
                  }));
                  return;
                }
                setForm((current) => ({ ...current, destLabel: value }));
              }}
            />
            {(searching || suggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {searching && (
                  <p className="px-2 py-1 text-[10px] text-slate-400">
                    Buscando...
                  </p>
                )}
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.lat},${suggestion.lng}`}
                    type="button"
                    onClick={() => pickSuggestion(suggestion)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-snug text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <button
            type="button"
            onClick={() => setPickingOnMap(!pickingOnMap)}
            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              pickingOnMap
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {pickingOnMap
              ? 'Cancelar seleccion en el mapa'
              : 'Elegir en el mapa'}
          </button>
          {outsideCucuta && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              El punto queda fuera del area de Cucuta: el destino debe estar
              dentro del perimetro urbano.
            </p>
          )}
          <input
            className={INPUT}
            placeholder="Producto / contenido * (ej. Insulina NPH 100UI)"
            required
            value={form.productLabel}
            onChange={(e) =>
              setForm({ ...form, productLabel: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={INPUT}
              type="number"
              min={1}
              placeholder="Cantidad"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <select
              className={INPUT}
              value={form.cargoType}
              onChange={(e) =>
                setForm({
                  ...form,
                  cargoType: e.target.value as CargoType,
                })
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
            required
            value={form.pickupPointId}
            onChange={(e) =>
              setForm({ ...form, pickupPointId: e.target.value })
            }
          >
            <option value="">Punto de recogida *</option>
            {pickupPoints.map((point) => (
              <option key={point.id} value={point.id}>
                Recoger en: {point.name}
              </option>
            ))}
          </select>
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

      {visibleOrders.map((order) => (
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
            {order.productLabel ?? 'Envio'}
            {order.quantity ? ` × ${order.quantity}` : ''}
            {order.cargoType ? ` · ${CARGO_LABELS[order.cargoType]}` : ''}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            Recogida:{' '}
            {pickupPoints.find((point) => point.id === order.pickupPointId)
              ?.name ?? 'por definir'}{' '}
            · Entrega:{' '}
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

      {!loading && orders.length > 0 && visibleOrders.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ninguna orden coincide con la busqueda.
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
