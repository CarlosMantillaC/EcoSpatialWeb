export interface Coords {
  lat: number;
  lng: number;
}

/** LineString de GeoJSON: pares [lng, lat]. */
export type LineStringCoords = [number, number][];

/** Objeto GeoJSON LineString completo ({ type, coordinates }). */
export interface GeoJsonLineString {
  type?: string;
  coordinates?: LineStringCoords | null;
}

/**
 * Normaliza la geometria de una ruta al array de coordenadas. Admite el
 * array crudo [lng, lat][] o el objeto GeoJSON LineString completo que
 * devuelve OSRM ({ type: 'LineString', coordinates: [...] }), que es como
 * se persiste en `dispatches.route_geometry`.
 */
export function toLineStringCoords(
  geometry: LineStringCoords | GeoJsonLineString | null | undefined,
): LineStringCoords | null {
  if (!geometry) return null;
  if (Array.isArray(geometry)) return geometry;
  const coordinates = geometry.coordinates;
  return Array.isArray(coordinates) ? coordinates : null;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coords, b: Coords): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Devuelve el punto situado a `progress` (0..1) de la longitud acumulada
 * de una LineString, interpolando linealmente entre los vertices que lo
 * contienen. Acepta el array de coordenadas o el objeto GeoJSON completo.
 * Si `geometry` es vacia o nula, interpola de `fallback.from` a
 * `fallback.to`. `progress` se acota a [0, 1].
 */
export function positionAlongRoute(
  geometry: LineStringCoords | GeoJsonLineString | null | undefined,
  progress: number,
  fallback: { from: Coords; to: Coords },
): Coords {
  const clamped = Math.min(1, Math.max(0, progress));
  const coords = toLineStringCoords(geometry);
  const points =
    coords && coords.length > 0
      ? coords.map(([lng, lat]) => ({ lat, lng }))
      : [fallback.from, fallback.to];

  if (points.length === 1) return points[0];

  const segments: { a: Coords; b: Coords; lengthKm: number }[] = [];
  let totalKm = 0;
  for (let i = 1; i < points.length; i += 1) {
    const lengthKm = haversineKm(points[i - 1], points[i]);
    segments.push({ a: points[i - 1], b: points[i], lengthKm });
    totalKm += lengthKm;
  }

  // Ruta degenerada (todos los puntos en la misma posicion).
  if (totalKm === 0) return points[points.length - 1];

  const targetKm = clamped * totalKm;
  let travelled = 0;
  for (const segment of segments) {
    if (travelled + segment.lengthKm >= targetKm) {
      const ratio =
        segment.lengthKm === 0 ? 0 : (targetKm - travelled) / segment.lengthKm;
      return {
        lat: segment.a.lat + (segment.b.lat - segment.a.lat) * ratio,
        lng: segment.a.lng + (segment.b.lng - segment.a.lng) * ratio,
      };
    }
    travelled += segment.lengthKm;
  }
  return points[points.length - 1];
}
