import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CargoType } from '../../common/cargo-type';
import { ServiceOrderPriority } from '../../entities/service-order.entity';
import { UserRole } from '../../entities/user.entity';
import { OrdersService } from '../orders/orders.service';
import { PickupPointsService } from '../pickup-points/pickup-points.service';
import { UsersService } from '../users/users.service';

/**
 * Sucursales iniciales del demo (siempre dentro del perimetro de Cucuta;
 * `seedIfEmpty` descarta cualquier punto fuera).
 */
const SEED_PICKUP_POINTS = [
  {
    name: 'Sucursal Centro',
    address: 'Av. 6 # 12-45, Centro',
    lat: 7.8895,
    lng: -72.5021,
  },
  {
    name: 'Sucursal Norte',
    address: 'Cra. 3 # 21-08, Cucuta Norte',
    lat: 7.9015,
    lng: -72.4991,
  },
  {
    name: 'Sucursal Sur',
    address: 'Cl. 14 # 5-62, La Playa',
    lat: 7.877,
    lng: -72.4895,
  },
];

/** Ordenes de ejemplo: farmacia domiciliaria en Cucuta. */
const SEED_ORDERS = [
  {
    clientName: 'Maria Gonzalez',
    contact: '300 555 0101',
    destLat: 7.8915,
    destLng: -72.5043,
    destLabel: 'Av. 5 # 32-14, Centro',
    productLabel: 'Insulina NPH 100UI',
    quantity: 2,
    cargoType: CargoType.REFRIGERATED,
    priority: ServiceOrderPriority.HIGH,
  },
  {
    clientName: 'Jorge Ramirez',
    contact: '300 555 0102',
    destLat: 7.9025,
    destLng: -72.5115,
    destLabel: 'Cra. 8 # 18-22, Cucuta Norte',
    productLabel: 'Acetaminofen 500mg',
    quantity: 5,
    cargoType: CargoType.GENERAL,
    priority: ServiceOrderPriority.MEDIUM,
  },
  {
    clientName: 'Lucia Fernandez',
    contact: '300 555 0103',
    destLat: 7.8792,
    destLng: -72.4921,
    destLabel: 'Cl. 10 # 4-19, La Playa',
    productLabel: 'Examenes de laboratorio',
    quantity: 1,
    cargoType: CargoType.FRAGILE,
    priority: ServiceOrderPriority.MEDIUM,
  },
];

/**
 * Siembra idempotente al arrancar: usuario administrador, sucursales y
 * ordenes de ejemplo. Cada pieza solo se crea si su tabla esta vacia.
 */
@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly pickupPointsService: PickupPointsService,
    private readonly ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedPickupPoints();
    await this.seedOrders();
  }

  /** Admin semilla: el unico que nace con rol administrador. */
  private async seedAdmin() {
    const email = this.config.get<string>('admin.seedEmail')!;
    const name = this.config.get<string>('admin.seedName')!;
    const existing = await this.usersService.findByEmail(email);
    if (existing) return;
    await this.usersService.createWithRole({
      email,
      name,
      role: UserRole.ADMIN,
    });
    this.logger.log(`Administrador semilla creado: ${email}`);
  }

  private async seedPickupPoints() {
    const created = await this.pickupPointsService.seedIfEmpty(
      SEED_PICKUP_POINTS,
    );
    if (created > 0) {
      this.logger.log(`${created} puntos de recogida sembrados`);
    }
  }

  /** Ordenes de ejemplo solo en una base limpia (demo del MVP). */
  private async seedOrders() {
    const existing = await this.ordersService.count();
    if (existing > 0) return;

    const points = await this.pickupPointsService.findAll(true);
    if (points.length === 0) return;

    for (const [index, order] of SEED_ORDERS.entries()) {
      // Se reparten entre las sucursales disponibles.
      const pickup = points[index % points.length];
      await this.ordersService.create({
        ...order,
        pickupPointId: pickup.id,
      });
    }
    this.logger.log(`${SEED_ORDERS.length} ordenes de ejemplo sembradas`);
  }
}
