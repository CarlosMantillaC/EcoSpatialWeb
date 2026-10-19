import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

interface LngLat {
  lat: number;
  lng: number;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('osrm.baseUrl')!;
  }

  async route(from: LngLat, to: LngLat): Promise<RouteResult> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${this.baseUrl}/route/v1/driving/${coords}`;
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { overview: 'full', geometries: 'geojson', steps: false },
          timeout: 8000,
        }),
      );
      const route = data?.routes?.[0];
      if (!route) {
        throw new Error('OSRM no devolvio rutas');
      }
      return {
        distanceKm: Math.round((route.distance / 1000) * 100) / 100,
        durationMin: Math.round((route.duration / 60) * 10) / 10,
        geometry: route.geometry,
      };
    } catch (error) {
      this.logger.error(`Fallo al consultar OSRM: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'El servicio de ruteo (OSRM) no esta disponible',
      );
    }
  }

  async matrixTable(points: LngLat[]): Promise<{
    distances: number[][];
    durations: number[][];
  }> {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${this.baseUrl}/table/v1/driving/${coords}`;
    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: { annotations: 'distance,duration' },
        timeout: 8000,
      }),
    );
    return {
      distances: data?.distances ?? [],
      durations: data?.durations ?? [],
    };
  }
}
