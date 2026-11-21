import { useCallback, useEffect, useRef, useState } from 'react';
import { useFleetStore } from '../../store/fleet';
import { useMapStore } from '../../store/map';
import { useOpsStore } from '../../store/ops';
import { useThemeStore } from '../../store/theme';
import { matchCommand, VOICE_COMMANDS, type VoiceCommandId } from './commands';
import { useSpeechRecognition } from './useSpeechRecognition';

interface Feedback {
  text: string;
  ok: boolean;
}

/** true si el foco esta en un campo o control donde Space tiene otro uso. */
function isBusyTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (tag === 'button' || tag === 'a' || tag === 'summary') return true;
  if (element.isContentEditable) return true;
  return element.getAttribute?.('role') === 'button';
}

/**
 * Control de voz: boton flotante abajo a la derecha del mapa. El clic
 * alterna el modo persistente; mantener Espacio escucha solo mientras
 * dure la pulsacion (walkie-talkie).
 */
interface VoiceControlProps {
  /** Estado del panel lateral izquierdo (para los comandos de voz). */
  panelHidden: boolean;
  onSetPanelHidden: (hidden: boolean) => void;
}

export function VoiceControl({
  panelHidden,
  onSetPanelHidden,
}: VoiceControlProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const setShowTraffic = useFleetStore((state) => state.setShowTraffic);
  const setFilter = useFleetStore((state) => state.setFilter);
  const clearMarkers = useFleetStore((state) => state.clearMarkers);
  const showMarkers = useFleetStore((state) => state.showMarkers);
  const clearRoute = useFleetStore((state) => state.clearRoute);
  const showRoute = useFleetStore((state) => state.showRoute);
  const refreshFleet = useFleetStore((state) => state.refresh);
  const runPreview = useFleetStore((state) => state.runPreview);
  const approveDispatch = useFleetStore((state) => state.approveDispatch);
  const completeLastDispatch = useFleetStore(
    (state) => state.completeLastDispatch,
  );
  const discardPreview = useFleetStore((state) => state.discardPreview);
  const setTheme = useThemeStore((state) => state.setTheme);
  const setOpsTab = useOpsStore((state) => state.setTab);
  const controls = useMapStore((state) => state.controls);

  const execute = useCallback(
    (id: VoiceCommandId) => {
      // Guardas de estado del despacho: sin contexto no hay accion.
      const fleet = useFleetStore.getState();

      switch (id) {
        case 'traffic_on':
          setShowTraffic(true);
          return 'Capa de trafico activada';
        case 'traffic_off':
          setShowTraffic(false);
          return 'Capa de trafico oculta';
        case 'dark':
          setTheme('dark');
          return 'Modo oscuro activado';
        case 'light':
          setTheme('light');
          return 'Modo claro activado';
        case 'center':
          controls?.center();
          return 'Mapa centrado';
        case 'zoom_in':
          controls?.zoomIn();
          return 'Zoom acercado';
        case 'zoom_out':
          controls?.zoomOut();
          return 'Zoom alejado';
        case 'show_all':
          void setFilter('all');
          return 'Mostrando todos los vehiculos';
        case 'show_free':
          void setFilter('libre');
          return 'Mostrando vehiculos disponibles';
        case 'show_route':
          void setFilter('en_ruta');
          return 'Mostrando vehiculos en ruta';
        case 'show_unassigned':
          void setFilter('sin_conductor');
          return 'Mostrando vehiculos libres';
        case 'show_unavailable':
          void setFilter('no_disponible');
          return 'Mostrando vehiculos no disponibles';
        case 'show_markers':
          showMarkers();
          return 'Marcadores visibles';
        case 'clear':
          clearMarkers();
          clearRoute();
          return 'Pantalla limpiada';
        case 'route_show':
          if (!fleet.lastDispatch) return 'No hay un viaje activo que mostrar';
          showRoute();
          return 'Ruta visible';
        case 'route_hide':
          if (!fleet.route && !fleet.preview) return 'La ruta ya esta oculta';
          clearRoute();
          return 'Ruta oculta';
        case 'refresh_fleet':
          void refreshFleet();
          return 'Actualizando flota...';
        case 'show_orders':
          setOpsTab('ordenes');
          return 'Mostrando ordenes de servicio';
        case 'show_reports':
          setOpsTab('reportes');
          return 'Mostrando reportes';
        case 'show_audit':
          setOpsTab('auditoria');
          return 'Mostrando auditoria';
        case 'panel_hide':
          if (panelHidden) return 'El panel ya esta oculto';
          onSetPanelHidden(true);
          return 'Panel lateral oculto';
        case 'panel_show':
          if (!panelHidden) return 'El panel ya esta visible';
          onSetPanelHidden(false);
          return 'Panel lateral visible';
        case 'dispatch_preview':
          if (fleet.loading) return 'Espera: hay una operacion en curso';
          if (!fleet.destination)
            return 'Elige primero un destino en el mapa';
          void runPreview();
          return 'Calculando el viaje...';
        case 'dispatch_approve':
          if (fleet.loading) return 'Espera: hay una operacion en curso';
          if (!fleet.preview) return 'No hay viaje pendiente de aprobacion';
          void approveDispatch();
          return 'Aprobando el viaje...';
        case 'dispatch_complete':
          if (fleet.loading) return 'Espera: hay una operacion en curso';
          if (!fleet.lastDispatch) return 'No hay servicio en curso';
          void completeLastDispatch();
          return 'Completando el servicio...';
        case 'dispatch_discard':
          if (fleet.preview) {
            discardPreview();
            return 'Viaje descartado';
          }
          if (fleet.destination) {
            discardPreview();
            return 'Destino descartado';
          }
          return 'No hay nada que descartar';
        default:
          return 'Comando no reconocido';
      }
    },
    [
      approveDispatch,
      clearMarkers,
      clearRoute,
      completeLastDispatch,
      controls,
      discardPreview,
      onSetPanelHidden,
      panelHidden,
      refreshFleet,
      runPreview,
      setFilter,
      setShowTraffic,
      setTheme,
      showMarkers,
      showRoute,
      setOpsTab,
    ],
  );

  const handleTranscript = useCallback(
    (text: string) => {
      const command = matchCommand(text);
      if (!command) {
        setFeedback({ text: `Sin comando: "${text}"`, ok: false });
        return;
      }
      const result = execute(command.id);
      setFeedback({ text: result, ok: true });
    },
    [execute],
  );

  const { supported, listening, interim, error, start, stop, toggle } =
    useSpeechRecognition(handleTranscript);

  // Solo el keyup de Espacio apaga lo que encendio Espacio: si el microfono
  // quedo encendido con el clic, soltar la tecla no debe cortarlo.
  const spaceHeldRef = useRef(false);
  const listeningRef = useRef(listening);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    if (!supported) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat) return;
      // Escritura y controles con foco conservan su uso normal de Space.
      if (isBusyTarget(event.target)) return;
      event.preventDefault();
      // Ya escuchando (modo clic): no secuestrar la pulsacion.
      if (listeningRef.current) return;
      spaceHeldRef.current = true;
      setOpen(true);
      start();
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space' || !spaceHeldRef.current) return;
      spaceHeldRef.current = false;
      event.preventDefault();
      stop();
    }

    // Si se pierde el foco con la tecla mantenida, el microfono no queda colgado.
    function releaseSpace() {
      if (!spaceHeldRef.current) return;
      spaceHeldRef.current = false;
      stop();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseSpace);
    document.addEventListener('visibilitychange', releaseSpace);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseSpace);
      document.removeEventListener('visibilitychange', releaseSpace);
    };
  }, [supported, start, stop]);

  const statusText = !supported
    ? 'Web Speech API no disponible en este navegador'
    : error
      ? error
      : listening
        ? interim
          ? `"${interim}"`
          : 'Escuchando...'
        : feedback
          ? feedback.text
          : 'Control por voz listo';

  const cardVisible = open || listening;

  function handleButtonClick() {
    if (!supported) return;
    toggle();
    setOpen(true);
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      {cardVisible && (
        <div className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Control por voz
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Ocultar el control por voz"
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Ocultar
            </button>
          </div>

          <p
            className={`mt-1 truncate text-sm ${
              feedback && !feedback.ok
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {statusText}
          </p>

          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Mantén <kbd className="rounded border border-slate-300 px-1 font-sans dark:border-slate-600">Espacio</kbd>{' '}
            para hablar; suéltalo para dejar de escuchar.
          </p>

          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {showHelp ? 'Ocultar' : 'Comandos'}
          </button>

          {showHelp && (
            <ul className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {VOICE_COMMANDS.map((command) => (
                <li key={command.id} className="flex justify-between gap-2">
                  <span>{command.label}</span>
                  <span className="text-slate-400">"{command.phrases[0]}"</span>
                </li>
              ))}
            </ul>
          )}

          {!supported && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Usa Chrome o Edge para habilitar los comandos de voz.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={!supported}
        title={
          supported
            ? 'Activar o desactivar el microfono · mantén Espacio para hablar'
            : 'Web Speech API no soportada'
        }
        aria-label="Control por voz"
        aria-pressed={listening}
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition ${
          listening
            ? 'voice-pulse bg-emerald-500 hover:bg-emerald-600'
            : 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
          />
        </svg>
      </button>
    </div>
  );
}
