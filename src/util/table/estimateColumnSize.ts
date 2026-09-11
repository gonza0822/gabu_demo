const DEFAULT_MIN = 72;
const DEFAULT_MAX = 480;
const CHAR_PX = 7.4;
const BASE_PAD = 32;

/** Ancho de columna según el encabezado y una muestra de valores (texto ya formateado). */
export function estimateColumnSize(
    header: string,
    values: unknown[],
    options?: { extraPad?: number; min?: number; max?: number }
): number {
    const min = options?.min ?? DEFAULT_MIN;
    const max = options?.max ?? DEFAULT_MAX;
    const extraPad = options?.extraPad ?? 0;
    let maxLen = String(header ?? "").trim().length;
    for (const value of values) {
        if (value == null || value === "") continue;
        const len = String(value).length;
        if (len > maxLen) maxLen = len;
    }
    return Math.min(max, Math.max(min, Math.ceil(maxLen * CHAR_PX) + BASE_PAD + extraPad));
}

export function sampleColumnValues<T>(rows: T[], getValue: (row: T) => unknown, limit = 200): unknown[] {
    if (rows.length === 0) return [];
    if (rows.length <= limit) return rows.map(getValue);
    const out: unknown[] = [];
    const step = rows.length / limit;
    for (let i = 0; i < limit; i++) {
        out.push(getValue(rows[Math.floor(i * step)]));
    }
    return out;
}
