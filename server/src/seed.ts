import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VehiclesService } from './modules/vehicles/vehicles.service';
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

const CENTER_LAT = parseFloat(process.env.SIMULATOR_CENTER_LAT ?? '-0.1807');
const CENTER_LNG = parseFloat(process.env.SIMULATOR_CENTER_LNG ?? '-78.4678');

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
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
  for (let i = 0; i < total; i += 1) {
    const onRoute = Math.random() < 0.25;
    await vehiclesService.create({
      plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
      driverName: DRIVERS[i % DRIVERS.length],
      cargoType: CARGOS[i % CARGOS.length],
      status: onRoute ? VehicleStatus.ON_ROUTE : VehicleStatus.FREE,
      lat: CENTER_LAT + randomBetween(-0.04, 0.04),
      lng: CENTER_LNG + randomBetween(-0.04, 0.04),
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed completado: ${total} vehiculos creados.`);
  await app.close();
}

void bootstrap();
