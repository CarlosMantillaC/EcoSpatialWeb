/**
 * Copia solo las propiedades definidas de un DTO.
 *
 * Con `transform: true`, class-transformer puede inyectar como propias
 * las campos no enviados con valor `undefined`; copiarlas tal cual con
 * `Object.assign` borra campos de la entidad en memoria (aunque la base
 * no se toque) y ensucia la respuesta del API.
 */
export function definedProps<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
