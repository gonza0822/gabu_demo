import { formatValueToYyyyMmDd } from "@/util/date/parseDate";

function parseNumericString(value: string): number | null {
    const raw = value.trim();
    if (!raw) return null;
    const normalized = raw.includes(",")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function isDecimalLikeObject(value: unknown): value is { s: number; e: number; d: number[] } {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
    return typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d);
}

function decimalLikeToString(value: { s: number; e: number; d: number[] }): string {
    if (value.d.length === 0) return "0";
    const coefficient = `${value.d[0]}${value.d.slice(1).map((chunk) => String(chunk).padStart(7, "0")).join("")}`;
    const exponent = value.e;
    let text: string;
    if (exponent < 0) {
        text = `0.${"0".repeat(Math.abs(exponent + 1))}${coefficient}`;
    } else if (exponent + 1 >= coefficient.length) {
        text = `${coefficient}${"0".repeat(exponent + 1 - coefficient.length)}`;
    } else {
        text = `${coefficient.slice(0, exponent + 1)}.${coefficient.slice(exponent + 1)}`;
    }
    text = text.replace(/\.?0+$/, "");
    if (!text) text = "0";
    return value.s < 0 ? `-${text}` : text;
}

function decimalLikeToNumber(value: { s: number; e: number; d: number[] }): number | null {
    const parsed = Number(decimalLikeToString(value));
    return Number.isFinite(parsed) ? parsed : null;
}

function objectToDisplayString(value: object): string {
    if (isDecimalLikeObject(value)) return decimalLikeToString(value);
    if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
        try {
            const n = (value as { toNumber: () => number }).toNumber();
            if (Number.isFinite(n)) return Number.isInteger(n) ? String(n) : String(n);
        } catch {
            /* seguir */
        }
    }
    const asString = String(value);
    if (asString && asString !== "[object Object]") return asString;
    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

/** Código / comprobante / proyecto: sin decimales de importe y alineado a la izquierda. */
export function isBusinessCodeColumn(columnId: string): boolean {
    const id = columnId.toLowerCase();
    if (id.startsWith("ds")) return false;
    return (
        id.startsWith("id") ||
        id.includes("tridactivo") ||
        id.includes("cod") ||
        id.includes("codigo") ||
        id.includes("cuenta") ||
        id.includes("negocio") ||
        id.includes("planta") ||
        id.includes("zona") ||
        id.includes("cencos") ||
        id.includes("proyecto") ||
        id.includes("nrocbt") ||
        id.includes("nro") ||
        id.includes("comprobante") ||
        id.includes("cdobra") ||
        id.includes("idarticulo")
    );
}

export function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") {
        const asNumber = Number(value);
        return Number.isFinite(asNumber) ? asNumber : null;
    }
    if (isDecimalLikeObject(value)) return decimalLikeToNumber(value);
    if (typeof value === "string") return parseNumericString(value);
    return null;
}

function valueToDisplayString(value: unknown): string {
    if (value == null || value === "") return "";
    if (typeof value === "string") return formatValueToYyyyMmDd(value);
    if (typeof value === "number") return String(value);
    if (typeof value === "bigint" || typeof value === "boolean") return String(value);
    if (value instanceof Date) return formatValueToYyyyMmDd(value);
    if (typeof value === "object") return objectToDisplayString(value);
    return formatValueToYyyyMmDd(value);
}

/**
 * Importes como Administrar (es-AR, 2 decimales). Códigos, comprobante y proyecto
 * se muestran sin decimales de moneda. Los Decimal de Prisma no se muestran como [object Object].
 */
export function formatManageGridCell(value: unknown, columnId: string): string {
    if (value == null || value === "") return "";
    if (isBusinessCodeColumn(columnId)) {
        return valueToDisplayString(value);
    }
    if (isLikelyNumericField(columnId)) {
        const numeric = toFiniteNumber(value);
        if (numeric != null) {
            const isIndice = columnId.toLowerCase().includes("indice");
            if (isIndice) return formatNumberEs(numeric, 7, 7);
            return formatNumberEs(numeric, 2, 2);
        }
    }
    return valueToDisplayString(value);
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
