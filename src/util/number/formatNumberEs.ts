function parseNumericString(value: string): number | null {
    const raw = value.trim();
    if (!raw) return null;
    const normalized = raw.includes(",")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberEs(value: number, minimumFractionDigits = 0, maximumFractionDigits = 2): string {
    return value.toLocaleString("es-AR", {
        minimumFractionDigits,
        maximumFractionDigits,
    });
}

const NUMERIC_NAME_HINTS = [
    "coef",
    "coefi",
    "importe",
    "monto",
    "valor",
    "neto",
    "amort",
    "indice",
    "porcentaje",
    "saldo",
    "debe",
    "haber",
];

const NON_NUMERIC_NAME_HINTS = ["cod", "codigo", "id", "nro", "numero", "cuenta"];

/**
 * Columnas que en BD son texto (p. ej. NVarChar) y no deben formatearse con separadores de miles.
 * El `BrowNombre` puede incluir palabras de NUMERIC_NAME_HINTS ("valor", "importe") y antes ganaban
 * sobre la pista "id" del IdCampo → `isLikelyNumericField` devolvía true por error.
 */
const FORCE_STRING_DISPLAY_COLUMN_IDS = new Set([
    "idreserva",
    "idresultado",
    "idamacumulada",
    "idamajuste",
]);

export function isLikelyNumericField(fieldId?: string, label?: string): boolean {
    const idLower = (fieldId ?? "").trim().toLowerCase();
    if (FORCE_STRING_DISPLAY_COLUMN_IDS.has(idLower)) return false;

    const source = `${fieldId ?? ""} ${label ?? ""}`.toLowerCase();
    const hasNumericHint = NUMERIC_NAME_HINTS.some((hint) => source.includes(hint));
    const hasNonNumericHint = NON_NUMERIC_NAME_HINTS.some((hint) => source.includes(hint));
    if (hasNumericHint) return true;
    if (hasNonNumericHint) return false;
    return false;
}

export function formatNumericDisplayValue(
    value: unknown,
    columnId?: string,
    options?: { parseNumericStrings?: boolean }
): unknown {
    const colLower = (columnId ?? "").trim().toLowerCase();
    if (FORCE_STRING_DISPLAY_COLUMN_IDS.has(colLower)) {
        if (value == null || value === "") return "";
        return String(value);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return formatNumberEs(value);
    }

    if (typeof value === "bigint") {
        const asNumber = Number(value);
        return Number.isFinite(asNumber) ? formatNumberEs(asNumber) : String(value);
    }

    if (typeof value === "string" && options?.parseNumericStrings) {
        const parsed = parseNumericString(value);
        if (parsed != null) return formatNumberEs(parsed);
    }

    if (value != null && typeof value === "object") {
        const parsed = parseNumericString(String(value));
        if (parsed != null) return formatNumberEs(parsed);
    }

    return value;
}
