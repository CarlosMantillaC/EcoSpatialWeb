import { useEffect, useRef } from 'react';
import { useAlertsStore } from '../store/alerts';
import type { FleetAlert } from '../types';

const TYPE_LABEL: Record<FleetAlert['type'], string> = {
  geocerca: 'Geocerca',
  velocidad: 'Velocidad',
  llegada: 'Llegada',
  sistema: 'Sistema',
};

const TYPE_STYLE: Record<FleetAlert['type'], string> = {
  geocerca:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  velocidad: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  llegada:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  sistema: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return 'hace instantes';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

/** Campana de notificaciones: alertas operativas en tiempo real (SSE). */
export function NotificationBell() {
  const alerts = useAlertsStore((state) => state.alerts);
  const unread = useAlertsStore((state) => state.unread);
  const open = useAlertsStore((state) => state.open);
  const setOpen = useAlertsStore((state) => state.setOpen);
  const load = useAlertsStore((state) => state.load);
  const markRead = useAlertsStore((state) => state.markRead);
  const markAllRead = useAlertsStore((state) => state.markAllRead);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Carga inicial del historial de alertas.
  useEffect(() => {
    void load();
  }, [load]);

  // Cierre al hacer clic fuera del panel.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, setOpen]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Notificaciones"
        className="relative rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-0 top-11 z-50 max-h-80 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Alertas
            </p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Marcar todas leidas
            </button>
          </div>

          {alerts.length === 0 && (
            <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">
              Sin alertas por ahora.
            </p>
          )}

          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => void markRead(alert.id)}
              className={`w-full rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                alert.readAt ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLE[alert.type]}`}
                >
                  {TYPE_LABEL[alert.type]}
                </span>
                <span className="text-[10px] text-slate-400">
                  {timeAgo(alert.createdAt)}
                </span>
                {!alert.readAt && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </div>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                {alert.message}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
