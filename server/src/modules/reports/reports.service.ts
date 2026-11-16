import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Alert, AlertSeverity } from '../../entities/alert.entity';
import { Dispatch } from '../../entities/dispatch.entity';
import {
  ServiceOrder,
  ServiceOrderStatus,
} from '../../entities/service-order.entity';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Rango por defecto: los ultimos 30 dias (inclusive hoy). */
function resolveRange(from?: string, to?: string): { from: Date; to: Date } {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * DAY_MS);
  return { from: startOfDay(start), to: new Date(end.getTime() + DAY_MS) };
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(';');
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchesRepository: Repository<Dispatch>,
    @InjectRepository(ServiceOrder)
    private readonly ordersRepository: Repository<ServiceOrder>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
  ) {}

  /** KPIs operativos agregados para el panel de reportes. */
  async summary(from?: string, to?: string) {
    const range = resolveRange(from, to);

    const [dispatchTotals, perDay, topVehicles, fleet, orders, alerts] =
      await Promise.all([
        this.dispatchTotals(range),
        this.perDay(range),
        this.topVehicles(range),
        this.fleetCounts(),
        this.orderCounts(),
        this.alertCounts(range),
      ]);

    return {
      range: { from: range.from, to: range.to },
      dispatches: dispatchTotals,
      perDay,
      topVehicles,
      fleet,
      orders,
      alerts,
    };
  }

  /** Historial de despachos en CSV (separador ";" para Excel en espanol). */
  async dispatchesCsv(from?: string, to?: string): Promise<string> {
    const range = resolveRange(from, to);
    const rows: Array<Record<string, unknown>> = await this.dispatchesRepository
      .query(
        `SELECT d.id, d.created_at, d.completed_at, d.status,
                d.origin_lat, d.origin_lng, d.dest_lat, d.dest_lng, d.dest_label,
                d.distance_km, d.duration_min,
                v.plate, v.driver_name
           FROM dispatches d
           LEFT JOIN vehicles v ON v.id = d.vehicle_id
          WHERE d.created_at BETWEEN $1 AND $2
          ORDER BY d.created_at DESC`,
        [range.from, range.to],
      );

    const lines = [
      csvRow([
        'id',
        'fecha',
        'completado_en',
        'estado',
        'placa',
        'conductor',
        'origen_lat',
        'origen_lng',
        'destino_lat',
        'destino_lng',
        'destino',
        'distancia_km',
        'duracion_min',
      ]),
    ];
    // Las fechas crudas llegan como Date de pg: se serializan a ISO.
    const iso = (value: unknown) =>
      value instanceof Date ? value.toISOString() : value;
    for (const row of rows) {
      lines.push(
        csvRow([
          row.id,
          iso(row.created_at),
          iso(row.completed_at),
          row.status,
          row.plate,
          row.driver_name,
          row.origin_lat,
          row.origin_lng,
          row.dest_lat,
          row.dest_lng,
          row.dest_label,
          row.distance_km,
          row.duration_min,
        ]),
      );
    }
    return lines.join('\n');
  }

  private async dispatchTotals(range: { from: Date; to: Date }) {
    const row: Record<string, unknown> | undefined =
      await this.dispatchesRepository
        .createQueryBuilder('d')
        .select('COUNT(*)::int', 'total')
        .addSelect(
          `COUNT(*) FILTER (WHERE d.status = 'completado')::int`,
          'completados',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE d.status = 'cancelado')::int`,
          'cancelados',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE d.status IN ('pendiente', 'asignado'))::int`,
          'activos',
        )
        .addSelect(
          `COALESCE(SUM(d.distance_km) FILTER (WHERE d.status = 'completado'), 0)::float`,
          'distanciaKm',
        )
        .addSelect(
          `COALESCE(AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)) / 60)
             FILTER (WHERE d.status = 'completado' AND d.completed_at IS NOT NULL), 0)::float`,
          'tiempoPromedioMin',
        )
        .where('d.created_at BETWEEN :from AND :to', range)
        .getRawOne();

    return {
      total: num(row?.total),
      completados: num(row?.completados),
      cancelados: num(row?.cancelados),
      activos: num(row?.activos),
      distanciaKm: Math.round(num(row?.distanciaKm) * 10) / 10,
      tiempoPromedioMin: Math.round(num(row?.tiempoPromedioMin) * 10) / 10,
    };
  }

  private async perDay(range: { from: Date; to: Date }) {
    const rows: Array<Record<string, unknown>> = await this.dispatchesRepository
      .createQueryBuilder('d')
      .select(`to_char(d.created_at, 'YYYY-MM-DD')`, 'fecha')
      .addSelect('COUNT(*)::int', 'despachos')
      .addSelect(
        `COUNT(*) FILTER (WHERE d.status = 'completado')::int`,
        'completados',
      )
      .addSelect(
        `COALESCE(SUM(d.distance_km) FILTER (WHERE d.status = 'completado'), 0)::float`,
        'distanciaKm',
      )
      .where('d.created_at BETWEEN :from AND :to', range)
      .groupBy(`to_char(d.created_at, 'YYYY-MM-DD')`)
      .orderBy('fecha', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      fecha: String(row.fecha),
      despachos: num(row.despachos),
      completados: num(row.completados),
      distanciaKm: Math.round(num(row.distanciaKm) * 10) / 10,
    }));
  }

  private async topVehicles(range: { from: Date; to: Date }) {
    const rows: Array<Record<string, unknown>> = await this.dispatchesRepository
      .createQueryBuilder('d')
      .innerJoin(Vehicle, 'v', 'v.id = d.vehicle_id')
      .select('v.plate', 'placa')
      .addSelect('v.driver_name', 'conductor')
      .addSelect('COUNT(*)::int', 'despachos')
      .addSelect(
        `COALESCE(SUM(d.distance_km) FILTER (WHERE d.status = 'completado'), 0)::float`,
        'distanciaKm',
      )
      .where('d.created_at BETWEEN :from AND :to', range)
      .groupBy('v.plate')
      .addGroupBy('v.driver_name')
      .orderBy('despachos', 'DESC')
      .limit(5)
      .getRawMany();

    return rows.map((row) => ({
      placa: String(row.placa),
      conductor: row.conductor ? String(row.conductor) : null,
      despachos: num(row.despachos),
      distanciaKm: Math.round(num(row.distanciaKm) * 10) / 10,
    }));
  }

  private async fleetCounts() {
    const [total, libre, enRuta, sinConductor] = await Promise.all([
      this.vehiclesRepository.count(),
      this.vehiclesRepository.count({ where: { status: VehicleStatus.FREE } }),
      this.vehiclesRepository.count({
        where: { status: VehicleStatus.ON_ROUTE },
      }),
      this.vehiclesRepository.count({
        where: { status: VehicleStatus.UNASSIGNED },
      }),
    ]);
    return { total, libre, enRuta, sinConductor };
  }

  private async orderCounts() {
    const counts = await Promise.all(
      Object.values(ServiceOrderStatus).map((status) =>
        this.ordersRepository.count({ where: { status } }),
      ),
    );
    const [pendientes, asignadas, completadas, canceladas] = counts;
    return {
      total: counts.reduce((sum, value) => sum + value, 0),
      pendientes,
      asignadas,
      completadas,
      canceladas,
    };
  }

  private async alertCounts(range: { from: Date; to: Date }) {
    const [total, noLeidas, criticas] = await Promise.all([
      this.alertsRepository
        .createQueryBuilder('a')
        .where('a.created_at BETWEEN :from AND :to', range)
        .getCount(),
      this.alertsRepository.count({ where: { readAt: IsNull() } }),
      this.alertsRepository.count({
        where: { severity: AlertSeverity.CRITICAL },
      }),
    ]);
    return { total, noLeidas, criticas };
  }
}
