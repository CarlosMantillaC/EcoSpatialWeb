import { useEffect, useState } from 'react';
import { auditApi } from '../../lib/api';
import type { AuditLogEntry } from '../../types';

const ACTION_LABEL: Record<string, string> = {
  'dispatch.approve': 'Despacho aprobado',
  'dispatch.complete': 'Servicio completado',
  'dispatch.cancel': 'Despacho cancelado',
  'order.create': 'Orden creada',
  'order.update': 'Orden editada',
  'order.cancel': 'Orden cancelada',
  'order.delete': 'Orden eliminada',
  'order.dispatch': 'Orden despachada',
  'vehicle.create': 'Vehiculo creado',
  'vehicle.update': 'Vehiculo editado',
  'vehicle.delete': 'Vehiculo eliminado',
  'driver.create': 'Conductor creado',
  'driver.update': 'Conductor editado',
  'driver.delete': 'Conductor eliminado',
};

/** Bitacora de acciones de los operadores sobre el negocio. */
export function AuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setEntries(await auditApi.list(50));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ultimas {entries.length} acciones
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {loading ? '...' : 'Actualizar'}
        </button>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
        >
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {ACTION_LABEL[entry.action] ?? entry.action}
            </span>
            <p className="ml-auto text-[10px] text-slate-400">
              {new Date(entry.createdAt).toLocaleString('es-CO')}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {entry.userEmail ?? 'Sistema'} · {entry.entityType}
            {entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}
          </p>
        </div>
      ))}

      {!loading && entries.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sin acciones registradas aun.
        </p>
      )}
    </div>
  );
}
