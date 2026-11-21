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
  | 'show_unassigned'
  | 'show_unavailable'
  | 'show_markers'
  | 'clear'
  | 'route_show'
  | 'route_hide'
  | 'show_orders'
  | 'show_reports'
  | 'show_audit'
  | 'refresh_fleet'
  | 'panel_hide'
  | 'panel_show'
  | 'dispatch_preview'
  | 'dispatch_approve'
  | 'dispatch_complete'
  | 'dispatch_discard'
  | 'show_all';

export interface VoiceCommandDefinition {
  id: VoiceCommandId;
  label: string;
  phrases: string[];
}

/**
 * Diccionario de comandos. El orden importa: matchCommand() ordena las
 * frases de mas larga a mas corta y, a igualdad, respeta este orden. Por
 * eso show_all va el ultimo: "mostrar vehiculos en ruta" debe caer en el
 * filtro en_ruta y no en "mostrar todos".
 */
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
    phrases: ['mostrar disponibles', 'vehiculos disponibles', 'disponibles'],
  },
  {
    id: 'show_route',
    label: 'Mostrar en ruta',
    phrases: ['mostrar en ruta', 'vehiculos en ruta', 'en ruta'],
  },
  {
    id: 'show_unassigned',
    label: 'Mostrar libres',
    phrases: ['mostrar libres', 'vehiculos libres', 'libres'],
  },
  {
    id: 'show_unavailable',
    label: 'Mostrar no disponibles',
    phrases: [
      'mostrar no disponibles',
      'vehiculos no disponibles',
      'no disponibles',
    ],
  },
  {
    id: 'show_markers',
    label: 'Mostrar marcadores',
    phrases: ['mostrar marcadores', 'ver marcadores'],
  },
  {
    id: 'clear',
    label: 'Limpiar pantalla',
    phrases: ['limpiar pantalla', 'limpiar mapa', 'limpiar'],
  },
  {
    id: 'route_show',
    label: 'Mostrar ruta',
    phrases: ['mostrar ruta', 'ver ruta'],
  },
  {
    id: 'route_hide',
    label: 'Ocultar ruta',
    phrases: ['ocultar ruta', 'quitar ruta'],
  },
  {
    id: 'show_orders',
    label: 'Mostrar ordenes',
    phrases: ['mostrar ordenes', 'ver ordenes', 'ordenes de servicio'],
  },
  {
    id: 'show_reports',
    label: 'Mostrar reportes',
    phrases: ['mostrar reportes', 'ver reportes', 'reportes'],
  },
  {
    id: 'show_audit',
    label: 'Mostrar auditoria',
    phrases: ['mostrar auditoria', 'ver auditoria', 'auditoria', 'bitacora'],
  },
  {
    id: 'refresh_fleet',
    label: 'Actualizar flota',
    phrases: ['actualizar flota', 'refrescar flota', 'refrescar'],
  },
  {
    id: 'panel_hide',
    label: 'Ocultar panel lateral',
    phrases: ['ocultar panel', 'cerrar panel'],
  },
  {
    id: 'panel_show',
    label: 'Mostrar panel lateral',
    phrases: ['mostrar panel', 'abrir panel'],
  },
  {
    id: 'dispatch_preview',
    label: 'Calcular viaje',
    phrases: ['calcular viaje', 'calcular ruta', 'previsualizar viaje'],
  },
  {
    id: 'dispatch_approve',
    label: 'Aprobar viaje',
    phrases: ['aprobar viaje', 'confirmar viaje', 'aprobar'],
  },
  {
    id: 'dispatch_complete',
    label: 'Completar servicio',
    phrases: [
      'completar servicio',
      'completar viaje',
      'finalizar viaje',
      'terminar viaje',
    ],
  },
  {
    id: 'dispatch_discard',
    label: 'Descartar envio',
    phrases: ['descartar viaje', 'descartar envio', 'descartar'],
  },
  // Ultimo a proposito: gana solo si ninguna frase mas larga encaja.
  {
    id: 'show_all',
    label: 'Mostrar todos',
    phrases: [
      'mostrar todos',
      'todos los vehiculos',
      'mostrar todo',
      'mostrar vehiculos',
      'sin filtro',
      'quitar filtro',
    ],
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
