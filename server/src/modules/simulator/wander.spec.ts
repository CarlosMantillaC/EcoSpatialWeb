import { haversineKm } from '../../common/geo';
import {
  randomWaypoint,
  wanderStep,
  WANDER_MAX_KM,
  WANDER_MIN_KM,
  type WanderState,
} from './wander';

// Ruta horizontal de 0.02 grados en el ecuador (~2.22 km).
const baseState: WanderState = {
  geometry: [
    [-78.48, -0.18],
    [-78.46, -0.18],
  ],
  from: { lat: -0.18, lng: -78.48 },
  to: { lat: -0.18, lng: -78.46 },
  progress: 0,
  durationSec: 100,
};

describe('wanderStep', () => {
  it('avanza el progreso segun la duracion real de la ruta', () => {
    const step = wanderStep(baseState, 5);
    expect(step.state.progress).toBeCloseTo(0.05, 6);
    expect(step.arrived).toBe(false);
    // 5 % del camino: lng interpola entre -78.48 y -78.46.
    expect(step.position.lng).toBeCloseTo(-78.479, 5);
  });

  it('interpola la posicion a lo largo de la geometria', () => {
    const step = wanderStep({ ...baseState, progress: 0.5 }, 0);
    expect(step.position.lng).toBeCloseTo(-78.47, 6);
  });

  it('marca la llegada y acota el progreso en 1', () => {
    const step = wanderStep({ ...baseState, progress: 0.99 }, 5);
    expect(step.arrived).toBe(true);
    expect(step.state.progress).toBe(1);
    expect(step.position.lng).toBeCloseTo(-78.46, 6);
  });

  it('no llega antes de tiempo con rutas largas', () => {
    const step = wanderStep({ ...baseState, durationSec: 3600 }, 3);
    expect(step.arrived).toBe(false);
    expect(step.state.progress).toBeCloseTo(3 / 3600, 6);
  });

  it('con duracion invalida salta al destino (mejor quieto que roto)', () => {
    const step = wanderStep({ ...baseState, durationSec: 0 }, 3);
    expect(step.arrived).toBe(true);
    expect(step.position.lng).toBeCloseTo(-78.46, 6);
  });
});

describe('randomWaypoint', () => {
  const origin = { lat: -0.18, lng: -78.48 };
  const center = origin;

  it('produce un punto dentro del rango de distancia pedido', () => {
    for (const r of [0.1, 0.3, 0.7, 0.9]) {
      // Secuencia determinista: r para el angulo, 0 para la distancia minima.
      let call = 0;
      const rand = () => {
        call += 1;
        return call === 1 ? r : 0;
      };
      const point = randomWaypoint(origin, center, WANDER_MIN_KM, WANDER_MAX_KM, 0.05, rand);
      const distance = haversineKm(origin, point);
      expect(distance).toBeGreaterThanOrEqual(WANDER_MIN_KM - 0.05);
      expect(distance).toBeLessThanOrEqual(WANDER_MAX_KM + 0.05);
    }
  });

  it('con rand 0 el destino queda al norte exacto a la distancia minima', () => {
    const point = randomWaypoint(origin, center, 1, 3, 0.05, () => 0);
    expect(point.lng).toBeCloseTo(-78.48, 6);
    expect(haversineKm(origin, point)).toBeCloseTo(1, 1);
    expect(point.lat).toBeGreaterThan(origin.lat);
  });

  it('acota el destino al area de operacion', () => {
    // Origen ya en el borde: el destino no puede salirse del radio.
    const edge = { lat: center.lat + 0.049, lng: center.lng };
    const point = randomWaypoint(edge, center, 3, 3, 0.05, () => 0);
    expect(point.lat).toBeLessThanOrEqual(center.lat + 0.05 + 1e-9);
    expect(point.lng).toBeGreaterThanOrEqual(center.lng - 0.05 - 1e-9);
    expect(point.lng).toBeLessThanOrEqual(center.lng + 0.05 + 1e-9);
  });

  it('nunca devuelve NaN', () => {
    for (const r of [0, 0.5, 1]) {
      const point = randomWaypoint(origin, center, 1, 3, 0.05, () => r);
      expect(Number.isFinite(point.lat)).toBe(true);
      expect(Number.isFinite(point.lng)).toBe(true);
    }
  });
});
