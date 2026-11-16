import { useEffect, useState } from 'react';
import { reportsApi } from '../../lib/api';
import type { ReportSummary } from '../../types';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

/** KPIs operativos, grafica de servicios por dia y exportacion CSV. */
export function ReportsTab() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await reportsApi.summary(from, to));
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function downloadCsv() {
    setDownloading(true);
    try {
      await reportsApi.downloadDispatchesCsv(from, to);
    } catch {
      setError('No se pudo descargar el CSV.');
    } finally {
      setDownloading(false);
    }
  }

  const maxDay = Math.max(
    1,
    ...(summary?.perDay ?? []).map((day) => day.despachos),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Ver'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <KpiCard
              label="Servicios completados"
              value={String(summary.dispatches.completados)}
            />
            <KpiCard
              label="Distancia total"
              value={`${summary.dispatches.distanciaKm} km`}
            />
            <KpiCard
              label="Tiempo promedio"
              value={`${summary.dispatches.tiempoPromedioMin} min`}
            />
            <KpiCard
              label="Cancelados"
              value={String(summary.dispatches.cancelados)}
            />
            <KpiCard
              label="Ordenes pendientes"
              value={String(summary.orders.pendientes)}
            />
            <KpiCard
              label="Disponibles"
              value={`${summary.fleet.libre}/${summary.fleet.total}`}
            />
            <KpiCard
              label="Vehiculos libres"
              value={String(summary.fleet.sinConductor)}
            />
            <KpiCard
              label="Alertas del periodo"
              value={String(summary.alerts.total)}
            />
            <KpiCard
              label="Tasa de exito"
              value={
                summary.dispatches.total > 0
                  ? `${Math.round(
                      (summary.dispatches.completados /
                        summary.dispatches.total) *
                        100,
                    )}%`
                  : '—'
              }
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Servicios por dia
            </p>
            {summary.perDay.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin actividad en el rango.
              </p>
            )}
            <div className="flex h-24 items-end gap-1">
              {summary.perDay.map((day) => (
                <div
                  key={day.fecha}
                  className="flex-1 rounded-t bg-emerald-500/80"
                  style={{
                    height: `${Math.max(8, (day.despachos / maxDay) * 100)}%`,
                  }}
                  title={`${day.fecha}: ${day.despachos} despacho(s), ${day.distanciaKm} km`}
                />
              ))}
            </div>
            {summary.perDay.length > 0 && (
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>{summary.perDay[0].fecha}</span>
                <span>{summary.perDay[summary.perDay.length - 1].fecha}</span>
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Vehiculos destacados
            </p>
            {summary.topVehicles.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin despachos en el rango.
              </p>
            )}
            {summary.topVehicles.map((vehicle) => (
              <div
                key={vehicle.placa}
                className="flex items-center justify-between rounded-lg px-1 py-1 text-xs odd:bg-slate-50 dark:odd:bg-slate-800/50"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {vehicle.placa}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {vehicle.conductor ?? 'Sin conductor'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {vehicle.despachos} viaje(s)
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {vehicle.distanciaKm} km
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={downloading}
            className="w-full rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            {downloading ? 'Descargando...' : 'Descargar CSV de despachos'}
          </button>
        </>
      )}
    </div>
  );
}
