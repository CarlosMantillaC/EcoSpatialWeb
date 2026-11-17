import { useAuthStore } from '../../store/auth';
import { useOpsStore, type OpsTab } from '../../store/ops';
import { AuditTab } from './AuditTab';
import { DriversTab } from './DriversTab';
import { OrdersTab } from './OrdersTab';
import { ReportsTab } from './ReportsTab';

const OPERATOR_TABS: { id: OpsTab; label: string }[] = [
  { id: 'ordenes', label: 'Ordenes' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'auditoria', label: 'Auditoria' },
];

const ADMIN_TABS: { id: OpsTab; label: string }[] = [
  { id: 'conductores', label: 'Conductores' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'auditoria', label: 'Auditoria' },
];

/**
 * Panel de operaciones: cola de ordenes y despachos para la operadora;
 * plantilla de conductores para el administrador (que tambien gestiona
 * vehiculos y sucursales desde su propia vista). Reportes y auditoria
 * comunes a ambos.
 */
export function OpsPanel() {
  const tab = useOpsStore((state) => state.tab);
  const setTab = useOpsStore((state) => state.setTab);
  const role = useAuthStore((state) => state.user?.role);

  const tabs = role === 'admin' ? ADMIN_TABS : OPERATOR_TABS;
  // Una pestana que no aplica al rol cae en la primera disponible.
  const activeTab = tabs.some((item) => item.id === tab)
    ? tab
    : tabs[0].id;

  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Operacion
      </h2>

      <div className="mb-3 flex gap-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              activeTab === id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'ordenes' && <OrdersTab />}
      {activeTab === 'conductores' && <DriversTab />}
      {activeTab === 'reportes' && <ReportsTab />}
      {activeTab === 'auditoria' && <AuditTab />}
    </div>
  );
}
