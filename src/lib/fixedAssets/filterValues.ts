export type FilterValues = {
    cuenta: string[];
    centroCosto: string[];
    planta: string[];
    unidadNegocio: string[];
    ubicacion: string[];
    baja: string[];
    origen: string[];
};

export const EMPTY_FILTERS: FilterValues = {
    cuenta: [],
    centroCosto: [],
    planta: [],
    unidadNegocio: [],
    ubicacion: [],
    baja: [],
    origen: [],
};

const FILTER_KEYS: (keyof FilterValues)[] = [
    "cuenta",
    "centroCosto",
    "planta",
    "unidadNegocio",
    "ubicacion",
    "baja",
    "origen",
];

export function hasActiveFilters(filters: FilterValues): boolean {
    return Object.values(filters).some((keys) => keys.length > 0);
}

export function areFiltersEqual(a: FilterValues, b: FilterValues): boolean {
    return FILTER_KEYS.every((key) => {
        const left = [...a[key]].map(String).filter(Boolean).sort();
        const right = [...b[key]].map(String).filter(Boolean).sort();
        return left.length === right.length && left.every((value, index) => value === right[index]);
    });
}

export type SavedFilterRow = {
    id: number;
    nombre: string;
    filtros: FilterValues;
};

export function parseSavedFilterValues(raw: unknown): FilterValues {
    const next: FilterValues = { ...EMPTY_FILTERS };
    if (!raw || typeof raw !== "object") return next;
    const obj = raw as Record<string, unknown>;
    for (const key of FILTER_KEYS) {
        const value = obj[key];
        if (Array.isArray(value)) {
            next[key] = value.map((item) => String(item)).filter((item) => item.length > 0);
        }
    }
    return next;
}
