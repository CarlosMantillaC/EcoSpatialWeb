interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Campo de busqueda estandar de las tarjetas: lupa a la izquierda y
 * boton para limpiar. Cada seccion decide que campos entran en la
 * comparacion (ver lib/search.ts).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
}: SearchInputProps) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.34-4.34M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Limpiar busqueda"
          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}
