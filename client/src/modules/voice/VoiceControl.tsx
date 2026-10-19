import { useCallback, useState } from 'react';
import { useFleetStore } from '../../store/fleet';
import { useMapStore } from '../../store/map';
import { useThemeStore } from '../../store/theme';
import { matchCommand, VOICE_COMMANDS, type VoiceCommandId } from './commands';
import { useSpeechRecognition } from './useSpeechRecognition';

interface Feedback {
  text: string;
  ok: boolean;
}

export function VoiceControl() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const setShowTraffic = useFleetStore((state) => state.setShowTraffic);
  const setFilter = useFleetStore((state) => state.setFilter);
  const clearMarkers = useFleetStore((state) => state.clearMarkers);
  const clearRoute = useFleetStore((state) => state.clearRoute);
  const setTheme = useThemeStore((state) => state.setTheme);
  const controls = useMapStore((state) => state.controls);

  const execute = useCallback(
    (id: VoiceCommandId) => {
      switch (id) {
        case 'traffic_on':
          setShowTraffic(true);
          return 'Capa de trafico activada';
        case 'traffic_off':
          setShowTraffic(false);
          return 'Capa de trafico ocultada';
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
        case 'show_free':
          void setFilter('libre');
          return 'Mostrando vehiculos disponibles';
        case 'show_route':
          void setFilter('en_ruta');
          return 'Mostrando vehiculos en ruta';
        case 'clear':
          clearMarkers();
          clearRoute();
          return 'Pantalla limpiada';
        default:
          return 'Comando no reconocido';
      }
    },
    [
      clearMarkers,
      clearRoute,
      controls,
      setFilter,
      setShowTraffic,
      setTheme,
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

  const { supported, listening, interim, error, toggle } =
    useSpeechRecognition(handleTranscript);

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

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!supported}
          title={
            supported
              ? 'Activar o desactivar el microfono'
              : 'Web Speech API no soportada'
          }
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition ${
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

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Control por voz
          </p>
          <p
            className={`truncate text-sm ${
              feedback && !feedback.ok
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {statusText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((value) => !value)}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {showHelp ? 'Ocultar' : 'Comandos'}
        </button>
      </div>

      {showHelp && (
        <ul className="mt-3 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
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
  );
}
