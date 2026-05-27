export type CostCenterCodciaRow = {
    idCencos?: string | null;
    codcia?: string | null;
};

function codciaToText(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
        if (typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d) && maybe.d.length > 0) {
            const coefficient = `${maybe.d[0]}${maybe.d.slice(1).map((chunk) => String(chunk).padStart(7, "0")).join("")}`;
            let text: string;
            if (maybe.e < 0) {
                text = `0.${"0".repeat(Math.abs(maybe.e + 1))}${coefficient}`;
            } else if (maybe.e + 1 >= coefficient.length) {
                text = `${coefficient}${"0".repeat(maybe.e + 1 - coefficient.length)}`;
            } else {
                text = `${coefficient.slice(0, maybe.e + 1)}.${coefficient.slice(maybe.e + 1)}`;
            }
            const asNumber = Number(text);
            if (Number.isFinite(asNumber)) return String(Math.trunc(asNumber));
            return text.trim();
        }
    }
    const text = String(value).trim();
    if (!text) return "";
    if (/^\d+$/.test(text)) return String(parseInt(text, 10));
    if (/^\d+[.,]\d+$/.test(text)) {
        const parsed = Number(text.replace(",", "."));
        if (Number.isFinite(parsed)) return String(Math.trunc(parsed));
    }
    return text;
}

/** Variantes de comparación para codcia (p. ej. "1" vs "001" en NVarChar(3)). */
export function costCenterCodciaMatchKeys(value: unknown): string[] {
    const text = codciaToText(value);
    if (!text) return [];
    const keys = new Set<string>([text, text.toLowerCase(), text.toUpperCase()]);
    if (/^\d+$/.test(text)) {
        const n = parseInt(text, 10);
        keys.add(String(n));
        keys.add(String(n).padStart(3, "0"));
        const unpadded = text.replace(/^0+/, "") || "0";
        keys.add(unpadded);
        keys.add(unpadded.padStart(3, "0"));
    }
    return [...keys];
}

/** Resuelve IdCencos buscando codcia del cargo en CCostos.codcia. */
export function findIdCencosByCodcia(costCenters: CostCenterCodciaRow[], chargeCodcia: unknown): string | null {
    const chargeKeys = costCenterCodciaMatchKeys(chargeCodcia);
    if (chargeKeys.length === 0) return null;
    const chargeKeySet = new Set(chargeKeys);
    for (const row of costCenters) {
        const dbKeys = costCenterCodciaMatchKeys(row.codcia);
        if (dbKeys.some((key) => chargeKeySet.has(key))) {
            const id = String(row.idCencos ?? "").trim();
            if (id) return id;
        }
    }
    return null;
}
