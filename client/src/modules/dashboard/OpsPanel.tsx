import { useOpsStore, type OpsTab } from '../../store/ops';
import { AuditTab } from './AuditTab';
import { DriversTab } from './DriversTab';
import { OrdersTab } from './OrdersTab';
import { ReportsTab } from './ReportsTab';

const TABS: { id: OpsTab; label: string }[] = [
  { id: 'ordenes', label: 'Ordenes' },
  { id: 'conductores', label: 'Conductores' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'auditoria', label: 'Auditoria' },
];

/**
 * Panel de operaciones del MVP: cola de ordenes de servicio, plantilla
 * de conductores, reportes con KPIs y bitacora de auditoria.
 */
export function OpsPanel() {
  const tab = useOpsStore((state) => state.tab);
  const setTab = useOpsStore((state) => state.setTab);

  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Operacion
      </h2>

      <div className="mb-3 flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              tab === id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ordenes' && <OrdersTab />}
      {tab === 'conductores' && <DriversTab />}
      {tab === 'reportes' && <ReportsTab />}
      {tab === 'auditoria' && <AuditTab />}
    </div>
  );
}
