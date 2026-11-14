import {
  isInsideCucuta,
  isRouteInsideCucuta,
  CUCUTA_BOUNDARY,
} from './cucuta-boundary';

describe('isInsideCucuta', () => {
  it.each([
    ['centro de operacion (config)', { lat: 7.889, lng: -72.4967 }],
    ['Parque Santander', { lat: 7.8892, lng: -72.5032 }],
    ['zona universitaria', { lat: 7.8943, lng: -72.5141 }],
    ['este de la ciudad', { lat: 7.895, lng: -72.47 }],
    ['norte de la ciudad', { lat: 7.93, lng: -72.51 }],
  ])('acepta puntos de Cucuta (%s)', (_name, point) => {
    expect(isInsideCucuta(point)).toBe(true);
  });

  it.each([
    ['San Antonio del Tachira (Venezuela)', { lat: 7.8167, lng: -72.4442 }],
    ['Urena (Venezuela)', { lat: 7.9175, lng: -72.4133 }],
    ['Puerto Santander (frontera)', { lat: 7.9022, lng: -72.3683 }],
    ['Los Patios (otro municipio)', { lat: 7.8364, lng: -72.5064 }],
    ['El Zulia (otro municipio)', { lat: 7.9333, lng: -72.6028 }],
  ])('rechaza puntos fuera de Cucuta (%s)', (_name, point) => {
    expect(isInsideCucuta(point)).toBe(false);
  });

  it('el anillo no toca la frontera: ningun vertice esta en Venezuela', () => {
    // El perimetro urbano termina varios km antes de San Antonio del
    // Tachira y Urena; su bbox debe quedar al oeste de -72.45.
    for (const [lng, lat] of CUCUTA_BOUNDARY) {
      expect(lat).toBeGreaterThan(7.85);
      expect(lat).toBeLessThan(7.96);
      expect(lng).toBeLessThan(-72.45);
    }
  });
});

describe('isRouteInsideCucuta', () => {
  it('acepta rutas completamente dentro del perimetro', () => {
    expect(
      isRouteInsideCucuta([
        [-72.5032, 7.8892],
        [-72.5, 7.89],
        [-72.49, 7.895],
      ]),
    ).toBe(true);
  });

  it('rechaza rutas que cruzan a Venezuela', () => {
    expect(
      isRouteInsideCucuta([
        [-72.4967, 7.889],
        [-72.45, 7.85],
        [-72.4442, 7.8167], // San Antonio del Tachira
      ]),
    ).toBe(false);
  });

  it('rechaza rutas que salen hacia otros municipios', () => {
    expect(
      isRouteInsideCucuta([
        [-72.4967, 7.889],
        [-72.5064, 7.8364], // Los Patios
      ]),
    ).toBe(false);
  });

  it('geometria vacia o nula no invalida la ruta', () => {
    expect(isRouteInsideCucuta(null)).toBe(true);
    expect(isRouteInsideCucuta(undefined)).toBe(true);
    expect(isRouteInsideCucuta([])).toBe(true);
    expect(isRouteInsideCucuta({ coordinates: null })).toBe(true);
  });
});
