import { Vehicle } from '../entities/vehicle.entity';
import { Dispatch } from '../entities/dispatch.entity';

export const ECO_CONTEXT = {
  eco: 'https://ecospatial.local/ontology#',
  schema: 'https://schema.org/',
  name: 'schema:name',
  status: 'eco:status',
  plate: 'schema:vehicleIdentifier',
  driverName: 'eco:driverName',
  cargoType: 'eco:cargoType',
  location: 'schema:location',
  lastUpdate: 'eco:lastUpdate',
};

export function vehicleToJsonLd(vehicle: Vehicle) {
  return {
    '@context': ECO_CONTEXT,
    '@type': ['schema:Vehicle', 'eco:FleetVehicle'],
    '@id': `eco:vehicle/${vehicle.id}`,
    name: vehicle.plate,
    plate: vehicle.plate,
    status: vehicle.status,
    driverName: vehicle.driverName ?? null,
    cargoType: vehicle.cargoType ?? null,
    location: {
      '@type': 'schema:GeoCoordinates',
      latitude: vehicle.lat,
      longitude: vehicle.lng,
    },
    lastUpdate: vehicle.lastUpdate,
  };
}

export function dispatchToJsonLd(dispatch: Dispatch) {
  return {
    '@context': ECO_CONTEXT,
    '@type': 'eco:RouteDispatch',
    '@id': `eco:dispatch/${dispatch.id}`,
    status: dispatch.status,
    driverName: null,
    from: {
      '@type': 'schema:GeoCoordinates',
      latitude: dispatch.originLat,
      longitude: dispatch.originLng,
    },
    to: {
      '@type': 'schema:GeoCoordinates',
      latitude: dispatch.destLat,
      longitude: dispatch.destLng,
    },
    distanceKm: dispatch.distanceKm ?? null,
    durationMin: dispatch.durationMin ?? null,
    assignedVehicle: dispatch.vehicleId ?? null,
    createdAt: dispatch.createdAt,
  };
}
