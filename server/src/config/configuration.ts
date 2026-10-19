export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url?: string;
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
    synchronize: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  webauthn: {
    rpId: string;
    rpName: string;
    origin: string;
  };
  devLoginEnabled: boolean;
  simulator: {
    enabled: boolean;
    intervalSeconds: number;
    vehicleCount: number;
    centerLat: number;
    centerLng: number;
  };
  osrm: {
    baseUrl: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'ecospatial',
    password: process.env.DB_PASSWORD ?? 'ecospatial',
    name: process.env.DB_NAME ?? 'ecospatial',
    ssl:
      (process.env.DB_SSL ??
        String(Boolean(process.env.DATABASE_URL))) === 'true',
    synchronize:
      process.env.DB_SYNCHRONIZE !== undefined
        ? process.env.DB_SYNCHRONIZE === 'true'
        : (process.env.NODE_ENV ?? 'development') !== 'production',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME ?? 'EcoSpatial Web',
    origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173',
  },
  devLoginEnabled:
    (process.env.DEV_LOGIN_ENABLED ?? 'false') === 'true' &&
    (process.env.NODE_ENV ?? 'development') !== 'production',
  simulator: {
    enabled: (process.env.SIMULATOR_ENABLED ?? 'true') === 'true',
    intervalSeconds: parseInt(process.env.SIMULATOR_INTERVAL_SECONDS ?? '15', 10),
    vehicleCount: parseInt(process.env.SIMULATOR_VEHICLE_COUNT ?? '12', 10),
    centerLat: parseFloat(process.env.SIMULATOR_CENTER_LAT ?? '-0.1807'),
    centerLng: parseFloat(process.env.SIMULATOR_CENTER_LNG ?? '-78.4678'),
  },
  osrm: {
    baseUrl: process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
  },
});
