import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VehiclesService } from './modules/vehicles/vehicles.service';
import { DriversService } from './modules/drivers/drivers.service';
import { RoutingService } from './modules/routing/routing.service';
import { randomWaypointInside } from './modules/simulator/wander';
import { isInsideCucuta } from './common/cucuta-boundary';
import { CargoType, CARGO_TYPES } from './common/cargo-type';
import { Driver } from './entities/driver.entity';
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
  'Paula Rios',
  'Camilo Diaz',
  'Valentina Rojas',
  'Hector Salas',
];

const CARGOS: CargoType[] = CARGO_TYPES;

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
    const route = await routing.route(
      point,
      randomWaypointInside(center, center, 0.3, 1, isInsideCucuta),
    );
    const first = route.geometry.coordinates[0];
    const snapped = { lng: first[0], lat: first[1] };
    // El snap no puede sacar al vehiculo del perimetro de Cucuta.
    return isInsideCucuta(snapped) ? snapped : point;
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
  let center = { lat: CENTER_LAT, lng: CENTER_LNG };
  if (!isInsideCucuta(center)) {
    // El geofence es el perimetro urbano de Cucuta: fuera de el se usa
    // el centro por defecto para no sembrar vehiculos fuera de Cucuta.
    // eslint-disable-next-line no-console
    console.warn(
      'SIMULATOR_CENTER fuera del perimetro de Cucuta; se usa el centro por defecto',
    );
    center = { lat: 7.889, lng: -72.4967 };
  }
  const routing = app.get(RoutingService);

  // Conductores primero: los vehiculos quedan vinculados a su perfil.
  const driversService = app.get(DriversService);
  const drivers: Driver[] = [];
  for (const name of DRIVERS) {
    drivers.push(
      await driversService.create({
        name,
        license: `LIC-${1000 + Math.floor(Math.random() * 9000)}`,
      }),
    );
  }

  for (let i = 0; i < total; i += 1) {
    const onRoute = Math.random() < 0.25;
    // Regla 1:1 — cada conductor conduce un solo vehiculo; los vehiculos
    // sobrantes quedan sin conductor.
    const driver = i < drivers.length ? drivers[i] : null;
    // Punto aleatorio del area, luego "snapped" a la calle real mas
    // cercana via OSRM (el primer vertice de una ruta corta). Si OSRM
    // no responde se usa el punto tal cual.
    const raw = randomWaypointInside(center, center, 0, 4.5, isInsideCucuta);
    const position = await snapToStreet(routing, raw, center);

    await vehiclesService.create({
      plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
      driverId: driver?.id ?? null,
      driverName: driver?.name ?? null,
      cargoType: CARGOS[i % CARGOS.length],
      // Sin conductor el vehiculo queda Libre ("sin_conductor"), salvo el
      // trafico de fondo sembrado en_ruta.
      ...(onRoute ? { status: VehicleStatus.ON_ROUTE } : {}),
      lat: position.lat,
      lng: position.lng,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed completado: ${total} vehiculos creados.`);
  await app.close();
}

void bootstrap();
