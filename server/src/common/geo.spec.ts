import { haversineKm, positionAlongRoute, toLineStringCoords } from './geo';

// Ruta horizontal de 0.02 grados de longitud en el ecuador (~2.22 km).
const route: [number, number][] = [
  [-78.48, -0.18],
  [-78.46, -0.18],
];
const from = { lat: -0.18, lng: -78.48 };
const to = { lat: -0.18, lng: -78.46 };

describe('positionAlongRoute', () => {
  it('devuelve el primer punto con progress 0', () => {
    const point = positionAlongRoute(route, 0, { from, to });
    expect(point.lat).toBeCloseTo(-0.18, 6);
    expect(point.lng).toBeCloseTo(-78.48, 6);
  });

  it('devuelve el ultimo punto con progress 1', () => {
    const point = positionAlongRoute(route, 1, { from, to });
    expect(point.lat).toBeCloseTo(-0.18, 6);
    expect(point.lng).toBeCloseTo(-78.46, 6);
  });

  it('interpola el punto medio en una ruta de un solo segmento', () => {
    const point = positionAlongRoute(route, 0.5, { from, to });
    expect(point.lat).toBeCloseTo(-0.18, 6);
    expect(point.lng).toBeCloseTo(-78.47, 6);
  });

  it('acota progress fuera del rango', () => {
    expect(positionAlongRoute(route, -1, { from, to }).lng).toBeCloseTo(
      -78.48,
      6,
    );
    expect(positionAlongRoute(route, 2, { from, to }).lng).toBeCloseTo(
      -78.46,
      6,
    );
  });

  it('usa el fallback cuando la geometria es nula o vacia', () => {
    const half = positionAlongRoute(null, 0.5, { from, to });
    expect(half.lat).toBeCloseTo(-0.18, 6);
    expect(half.lng).toBeCloseTo(-78.47, 6);

    const empty = positionAlongRoute([], 0.5, { from, to });
    expect(empty.lng).toBeCloseTo(-78.47, 6);
  });

  it('recorre una ruta de dos segmentos segun la distancia acumulada', () => {
    // Segmento corto (0.002 grados, 10 %) y largo (0.018, 90 %): el 50 %
    // de la distancia total esta a 0.010 grados del inicio (-78.47).
    const multi: [number, number][] = [
      [-78.48, -0.18],
      [-78.478, -0.18],
      [-78.46, -0.18],
    ];
    const point = positionAlongRoute(multi, 0.5, { from, to });
    expect(point.lng).toBeCloseTo(-78.47, 6);

    // Un progreso pequeno (2 %) cae dentro del primer segmento corto.
    const early = positionAlongRoute(multi, 0.02, { from, to });
    expect(early.lng).toBeGreaterThan(-78.48);
    expect(early.lng).toBeLessThan(-78.478);
  });

  it('devuelve el ultimo punto si todos los vertices coinciden', () => {
    const degenerate: [number, number][] = [
      [-78.47, -0.18],
      [-78.47, -0.18],
    ];
    const point = positionAlongRoute(degenerate, 0.3, { from, to });
    expect(point.lng).toBeCloseTo(-78.47, 6);
    expect(point.lat).toBeCloseTo(-0.18, 6);
  });

  it('la posicion interpolada es siempre un punto de la ruta (0..1)', () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const point = positionAlongRoute(route, progress, { from, to });
      expect(point.lng).toBeGreaterThanOrEqual(-78.48);
      expect(point.lng).toBeLessThanOrEqual(-78.46);
      expect(haversineKm(from, point)).toBeLessThanOrEqual(
        haversineKm(from, to) + 1e-9,
      );
    }
  });

  it('acepta el objeto GeoJSON LineString completo (OSRM/BD)', () => {
    // Regresion: route_geometry se guarda como { type, coordinates };
    // si se pasaba tal cual, caia al fallback en linea recta.
    const geojson = { type: 'LineString', coordinates: route };
    const point = positionAlongRoute(geojson, 0.5, {
      from: { lat: -0.16, lng: -78.5 },
      to: { lat: -0.16, lng: -78.4 },
    });
    // Debe seguir la ruta (-0.18) y NO la linea recta del fallback (-0.16).
    expect(point.lat).toBeCloseTo(-0.18, 6);
    expect(point.lng).toBeCloseTo(-78.47, 6);
  });

  it('acepta el objeto GeoJSON con coordenadas nulas y usa el fallback', () => {
    const geojson = { type: 'LineString', coordinates: null };
    const half = positionAlongRoute(geojson, 0.5, { from, to });
    expect(half.lng).toBeCloseTo(-78.47, 6);
  });
});

describe('toLineStringCoords', () => {
  it('devuelve el array tal cual', () => {
    expect(toLineStringCoords(route)).toBe(route);
  });

  it('extrae coordinates del objeto GeoJSON', () => {
    expect(toLineStringCoords({ type: 'LineString', coordinates: route })).toBe(
      route,
    );
  });

  it('devuelve null con geometria ausente o invalida', () => {
    expect(toLineStringCoords(null)).toBeNull();
    expect(toLineStringCoords(undefined)).toBeNull();
    expect(toLineStringCoords({ type: 'LineString', coordinates: null })).toBeNull();
    expect(toLineStringCoords({} as never)).toBeNull();
  });
});
