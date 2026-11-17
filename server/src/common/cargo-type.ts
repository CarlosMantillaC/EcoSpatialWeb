/**
 * Tipo de carga que un vehiculo puede transportar (capacidad) y que un
 * envio exige (demanda). La asignacion solo empareja tipos identicos:
 * un envio refrigerado jamas se asigna a un vehiculo general.
 */
export enum CargoType {
  GENERAL = 'general',
  REFRIGERATED = 'refrigerado',
  FRAGILE = 'fragil',
  EXPRESS = 'express',
  PARCEL = 'paqueteria',
}

export const CARGO_TYPES: CargoType[] = Object.values(CargoType);

/** Etiqueta legible para formularios y paneles. */
export const CARGO_LABELS: Record<CargoType, string> = {
  [CargoType.GENERAL]: 'General',
  [CargoType.REFRIGERATED]: 'Refrigerado',
  [CargoType.FRAGILE]: 'Fragil',
  [CargoType.EXPRESS]: 'Express',
  [CargoType.PARCEL]: 'Paqueteria',
};

export function isCargoType(value: unknown): value is CargoType {
  return (
    typeof value === 'string' &&
    (CARGO_TYPES as string[]).includes(value)
  );
}
