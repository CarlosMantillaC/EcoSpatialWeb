import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VehiclesService } from './modules/vehicles/vehicles.service';
import { RoutingService } from './modules/routing/routing.service';
import { randomWaypoint } from './modules/simulator/wander';
import { VehicleStatus } from './entities/vehicle.entity';

const DRIVERS = [
  'Ana Torres',
  'Luis Vega',
  'Maria Paredes',
  'Jorge Salazar',
  'Carla Mendez',
  'Diego Rojas',
  'Sofia Nunez',
  'Andres Cevallos',
];

const CARGOS = ['general', 'refrigerado', 'fragil', 'express', 'paqueteria'];

const CENTER_LAT = parseFloat(process.env.SIMULATOR_CENTER_LAT ?? '7.889');
const CENTER_LNG = parseFloat(process.env.SIMULATOR_CENTER_LNG ?? '-72.4967');

/**
 * Coloca el punto sobre la calle real mas cercana: pide una ruta corta
 * a un destino cercano y toma su primer vertice (ya snapped por OSRM).
 * Si OSRM falla, devuelve el punto original.
 */
async function snapToStreet(
  routing: RoutingService,
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
): Promise<{ lat: number; lng: number }> {
  try {
    const route = await routing.route(point, randomWaypoint(center, center, 0.3, 1));
    const first = route.geometry.coordinates[0];
    return { lng: first[0], lat: first[1] };
  } catch {
    return point;
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const vehiclesService = app.get(VehiclesService);

  const existing = await vehiclesService.count();
  if (existing > 0) {
    // eslint-disable-next-line no-console
    console.log(`La flota ya tiene ${existing} vehiculos. Seed omitido.`);
    await app.close();
    return;
  }

  const total = parseInt(process.env.SIMULATOR_VEHICLE_COUNT ?? '12', 10);
  const center = { lat: CENTER_LAT, lng: CENTER_LNG };
  const routing = app.get(RoutingService);

  for (let i = 0; i < total; i += 1) {
    const onRoute = Math.random() < 0.25;
    // Punto aleatorio del area, luego "snapped" a la calle real mas
    // cercana via OSRM (el primer vertice de una ruta corta). Si OSRM
    // no responde se usa el punto tal cual.
    const raw = randomWaypoint(center, center, 0, 4.5);
    const position = await snapToStreet(routing, raw, center);

    await vehiclesService.create({
      plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
      driverName: DRIVERS[i % DRIVERS.length],
      cargoType: CARGOS[i % CARGOS.length],
      status: onRoute ? VehicleStatus.ON_ROUTE : VehicleStatus.FREE,
      lat: position.lat,
      lng: position.lng,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed completado: ${total} vehiculos creados.`);
  await app.close();
}

void bootstrap();
