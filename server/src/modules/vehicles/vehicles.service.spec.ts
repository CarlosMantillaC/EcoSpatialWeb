import { haversineKm } from '../../common/geo';

describe('haversineKm', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(haversineKm({ lat: -0.18, lng: -78.47 }, { lat: -0.18, lng: -78.47 })).toBe(0);
  });

  it('calcula una distancia razonable Quito - Guayaquil', () => {
    const distance = haversineKm(
      { lat: -0.1807, lng: -78.4678 },
      { lat: -2.1709, lng: -79.9224 },
    );
    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(290);
  });

  it('es simetrica', () => {
    const a = { lat: -0.18, lng: -78.47 };
    const b = { lat: -0.2, lng: -78.5 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
