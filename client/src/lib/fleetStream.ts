import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useFleetStore } from '../store/fleet';
import type { FleetUpdate } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const MAX_BACKOFF_MS = 15_000;

/**
 * Mantiene una conexion SSE con el backend: actualiza la flota en vivo
 * y gestiona el auto-completado de despachos. Se reconecta solo con
 * backoff exponencial y se cierra al desmontar o al hacer logout.
 */
export function useFleetStream() {
  const token = useAuthStore((state) => state.token);
  const applyFleetUpdate = useFleetStore((state) => state.applyFleetUpdate);
  const handleDispatchCompleted = useFleetStore(
    (state) => state.handleDispatchCompleted,
  );
  // Guardamos las ultimas acciones en un ref para no recrear la
  // conexion en cada cambio del store.
  const actionsRef = useRef({ applyFleetUpdate, handleDispatchCompleted });
  actionsRef.current = { applyFleetUpdate, handleDispatchCompleted };

  useEffect(() => {
    if (!token) return;

    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let retryMs = 1000;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      const url = `${BASE_URL}/events/dispatch?token=${encodeURIComponent(token)}`;
      source = new EventSource(url);

      source.addEventListener('fleet', (event) => {
        retryMs = 1000;
        try {
          const data = JSON.parse((event as MessageEvent).data) as FleetUpdate;
          actionsRef.current.applyFleetUpdate(data);
        } catch {
          /* payload corrupto: se ignora */
        }
      });

      source.addEventListener('dispatch-completed', (event) => {
        retryMs = 1000;
        try {
          const data = JSON.parse((event as MessageEvent).data) as {
            dispatchId: string;
          };
          actionsRef.current.handleDispatchCompleted(data.dispatchId);
        } catch {
          /* payload corrupto: se ignora */
        }
      });

      source.onerror = () => {
        // EventSource reintenta solo salvo que este cerrado; aqui
        // forzamos el cierre y reconectamos con backoff controlado.
        source?.close();
        source = null;
        if (disposed) return;
        retryTimer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, MAX_BACKOFF_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      source?.close();
      source = null;
    };
  }, [token]);
}
