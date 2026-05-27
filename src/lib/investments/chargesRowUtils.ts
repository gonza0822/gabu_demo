export type ChargeRowData = Record<string, unknown>;

function normalizeKey(key: string): string {
    return key.trim().toLowerCase();
}

export function getRowValueByField(row: ChargeRowData, fieldId: string): unknown {
    if (fieldId in row) return row[fieldId];
    const normalized = normalizeKey(fieldId);
    const match = Object.keys(row).find((k) => normalizeKey(k) === normalized);
    return match ? row[match] : undefined;
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

function toIsoDateOnly(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    return value;
}

export function normalizeChargeCellValue(value: unknown, options?: { dateOnly?: boolean }): string | number {
    const dateOnly = options?.dateOnly ?? false;
    if (value == null) return "";
    if (typeof value === "string") return dateOnly ? toIsoDateOnly(value) : value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (isDecimalLikeObject(value)) return decimalLikeToString(value);
    if (value instanceof Date) {
        const iso = value.toISOString();
        return dateOnly ? iso.slice(0, 10) : iso;
    }
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}
