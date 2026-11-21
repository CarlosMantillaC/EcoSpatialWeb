import L from 'leaflet';
import { FormEvent, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { geocodeApi } from '../../lib/api';
import type { GeocodeSuggestion } from '../../types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const pinIcon = L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,.4);color:#fff;font-size:14px;font-weight:700">&#9679;</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
});

/** Aproximacion del area de Cucuta para avisar antes de guardar. */
const CUCUTA_BOUNDS = {
  minLat: 7.845,
  maxLat: 7.935,
  minLng: -72.56,
  maxLng: -72.43,
};

/** Nombre corto para la direccion (Nominatim devuelve direcciones largas). */
function shortLabel(label: string): string {
  return label
    .split(',')
    .slice(0, 3)
    .map((part) => part.trim())
    .join(', ');
}

/** Centra el mapa solo si el punto quedo fuera de la vista visible. */
function FollowMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const target: [number, number] = [lat, lng];
    if (!map.getBounds().contains(target)) {
      map.setView(target, Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/**
 * Selector de posicion de una sucursal: busqueda por nombre
 * (geocodificacion restringida a Cucuta) o clic en el mapa. El marcador
 * se puede arrastrar. El padre recibe las coordenadas y la direccion
 * detectada (con el instante de la seleccion, para que una edicion
 * manual posterior no sea pisada por una respuesta en vuelo).
 */
export function PickupPointMapPicker({
  lat,
  lng,
  onCoords,
  onAddress,
}: {
  lat: number;
  lng: number;
  onCoords: (lat: number, lng: number) => void;
  onAddress: (label: string, pickedAt: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Busqueda por nombre con debounce (mismo patron que el formulario de ordenes).
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      geocodeApi
        .search(text)
        .then((results) => setSuggestions(results))
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function pickSuggestion(suggestion: GeocodeSuggestion) {
    setSuggestions([]);
    setQuery(suggestion.label.split(',')[0]);
    onCoords(suggestion.lat, suggestion.lng);
    onAddress(shortLabel(suggestion.label), Date.now());
  }

  /** Direccion de un punto elegido en el mapa (clic o arrastre). */
  function resolveAddress(pickedLat: number, pickedLng: number) {
    const pickedAt = Date.now();
    geocodeApi
      .reverse(pickedLat, pickedLng)
      .then((result) => {
        if (result.label) onAddress(shortLabel(result.label), pickedAt);
      })
      .catch(() => undefined);
  }

  function pickOnMap(pickedLat: number, pickedLng: number) {
    onCoords(pickedLat, pickedLng);
    resolveAddress(pickedLat, pickedLng);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    if (suggestions.length > 0) pickSuggestion(suggestions[0]);
  }

  const outsideCucuta =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat < CUCUTA_BOUNDS.minLat ||
      lat > CUCUTA_BOUNDS.maxLat ||
      lng < CUCUTA_BOUNDS.minLng ||
      lng > CUCUTA_BOUNDS.maxLng);

  return (
    <div className="space-y-2">
      <div className="relative">
        <form onSubmit={handleSearchSubmit}>
          <input
            className={INPUT}
            placeholder="Busca un lugar de Cucuta (ej. Av. 6, Parque Santander)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        {(searching || suggestions.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {searching && (
              <p className="px-2 py-1 text-[10px] text-slate-400">
                Buscando...
              </p>
            )}
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.lat},${suggestion.lng}`}
                type="button"
                onClick={() => pickSuggestion(suggestion)}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-snug text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom
        className="h-56 w-full rounded-xl border border-slate-200 dark:border-slate-700"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FollowMarker lat={lat} lng={lng} />
        <ClickHandler onPick={pickOnMap} />
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const point = event.target.getLatLng();
              onCoords(point.lat, point.lng);
              resolveAddress(point.lat, point.lng);
            },
          }}
        />
      </MapContainer>

      <p className="text-[10px] text-slate-400">
        Haz clic en el mapa (o arrastra el marcador) para ubicar la sucursal;
        puedes refinar con los campos de coordenadas.
      </p>

      {outsideCucuta && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          El punto queda fuera del area de Cucuta: debe estar dentro del
          perimetro urbano.
        </p>
      )}
    </div>
  );
}
