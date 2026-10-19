export type VoiceCommandId =
  | 'traffic_on'
  | 'traffic_off'
  | 'dark'
  | 'light'
  | 'center'
  | 'zoom_in'
  | 'zoom_out'
  | 'show_free'
  | 'show_route'
  | 'clear';

export interface VoiceCommandDefinition {
  id: VoiceCommandId;
  label: string;
  phrases: string[];
}

export const VOICE_COMMANDS: VoiceCommandDefinition[] = [
  {
    id: 'traffic_on',
    label: 'Mostrar trafico',
    phrases: ['mostrar trafico', 'activar trafico', 'ver trafico'],
  },
  {
    id: 'traffic_off',
    label: 'Ocultar trafico',
    phrases: ['ocultar trafico', 'quitar trafico', 'desactivar trafico'],
  },
  { id: 'dark', label: 'Modo oscuro', phrases: ['modo oscuro'] },
  { id: 'light', label: 'Modo claro', phrases: ['modo claro'] },
  {
    id: 'center',
    label: 'Centrar mapa',
    phrases: ['centrar mapa', 'centrar'],
  },
  { id: 'zoom_in', label: 'Acercar', phrases: ['acercar', 'aumentar zoom'] },
  { id: 'zoom_out', label: 'Alejar', phrases: ['alejar', 'reducir zoom'] },
  {
    id: 'show_free',
    label: 'Mostrar disponibles',
    phrases: ['mostrar disponibles', 'vehiculos libres', 'disponibles'],
  },
  {
    id: 'show_route',
    label: 'Mostrar en ruta',
    phrases: ['mostrar en ruta', 'vehiculos en ruta', 'en ruta'],
  },
  {
    id: 'clear',
    label: 'Limpiar pantalla',
    phrases: ['limpiar pantalla', 'limpiar mapa', 'limpiar'],
  },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchCommand(text: string): VoiceCommandDefinition | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  const candidates = VOICE_COMMANDS.flatMap((command) =>
    command.phrases.map((phrase) => ({
      command,
      phrase: normalize(phrase),
    })),
  ).sort((a, b) => b.phrase.length - a.phrase.length);

  const match = candidates.find(({ phrase }) => normalized.includes(phrase));
  return match ? match.command : null;
}
