import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isInsideCucuta } from '../../common/cucuta-boundary';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Viewbox de Cúcuta (izquierda, arriba, derecha, abajo) para restringir
 * las busquedas al area urbana: Nominatim `bounded=1` solo devuelve
 * resultados dentro de esta caja.
 */
const CUCUTA_VIEWBOX = '-72.56,7.935,-72.43,7.845';

/** Politica de Nominatim: maximo 1 peticion por segundo. */
const REQUEST_INTERVAL_MS = 1100;

/** Tamano maximo de la cache en memoria. */
const CACHE_LIMIT = 200;

/**
 * Geocodificacion directa e inversa sobre Nominatim (OpenStreetMap),
 * gratuito y sin API key (mismo esquema que el ruteo OSRM publico).
 * Las peticiones se espacian y se cachean para respetar su politica de uso.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly baseUrl: string;
  private readonly cache = new Map<
    string,
    GeocodeResult | GeocodeResult[] | string
  >();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('geocode.baseUrl')!;
  }

  /** Busca lugares cercanos a Cúcuta; devuelve [] si el proveedor falla. */
  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    const key = `q:${query.trim().toLowerCase()}:${limit}`;
    const cached = this.cache.get(key);
    if (Array.isArray(cached)) return cached;

    try {
      const places = await this.request<NominatimPlace[]>('/search', {
        q: query,
        format: 'jsonv2',
        limit: String(limit),
        countrycodes: 'co',
        viewbox: CUCUTA_VIEWBOX,
        bounded: '1',
      });
      const results = (places ?? [])
        .map((place) => ({
          label: place.display_name,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
        }))
        // El geofence del despacho es el mismo: solo destinos validos.
        .filter(
          (result) =>
            Number.isFinite(result.lat) &&
            Number.isFinite(result.lng) &&
            isInsideCucuta(result),
        );
      this.remember(key, results);
      return results;
    } catch (error) {
      this.logger.warn(
        `Geocodificacion no disponible: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /** Nombre legible de un punto; null si el proveedor falla. */
  async reverse(lat: number, lng: number): Promise<string | null> {
    const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (typeof cached === 'string') return cached;

    try {
      const place = await this.request<NominatimPlace | null>('/reverse', {
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
      });
      const label = place?.display_name ?? null;
      this.remember(key, label ?? '');
      return label;
    } catch (error) {
      this.logger.warn(
        `Geocodificacion inversa no disponible: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    // Cola serial con espaciado minimo entre peticiones.
    const run = this.queue.then(async () => {
      const wait = REQUEST_INTERVAL_MS - (Date.now() - this.lastRequestAt);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      this.lastRequestAt = Date.now();
      const response = await firstValueFrom(
        this.http.get<T>(`${this.baseUrl}${path}`, {
          params,
          headers: { 'User-Agent': 'EcoSpatialWeb/1.0 (fleet demo)' },
          timeout: 6000,
        }),
      );
      return response.data;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private remember(key: string, value: GeocodeResult | GeocodeResult[] | string) {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}
