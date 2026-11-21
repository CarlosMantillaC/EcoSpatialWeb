/** Texto en minusculas y sin acentos: la busqueda ignora tildes. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * true si el texto buscado aparece en alguno de los campos de la ficha.
 * Una busqueda vacia siempre coincide, para no filtrar nada sin querer.
 */
export function matchesSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const needle = normalizeText(query.trim());
  if (!needle) return true;
  return fields.some((field) =>
    normalizeText(String(field ?? '')).includes(needle),
  );
}
