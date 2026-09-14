export type MoextraLabelRow = {
    idMoextra: string;
    Descripcion: string | null;
    clave?: string | null;
};

/** `ml` e `im` no están en `moextra`; el nombre visible es fijo. */
export const HARDCODED_BOOK_LABELS: Record<string, string> = {
    ml: "Moneda local",
    im: "Impuestos",
};

function norm(value: string): string {
    return value.trim().toLowerCase();
}

/** ME01 → 01, ME3 → 03 */
function idFromClaveMe(value: string): string | null {
    const m = norm(value).match(/^me(\d{1,2})$/);
    if (!m) return null;
    return m[1].padStart(2, "0");
}

function hardcodedBookLabel(idOrClave: string): string | null {
    const needle = norm(idOrClave);
    if (needle === "ml" || needle === "monedalocal") return HARDCODED_BOOK_LABELS.ml;
    if (needle === "im" || needle === "impuestos" || needle === "impuesto") return HARDCODED_BOOK_LABELS.im;
    return null;
}

/**
 * Nombre visible del libro.
 * `ml` / `im` van hardcodeados; el resto sale de `moextra.Descripcion`.
 */
export function labelFromMoextra(rows: MoextraLabelRow[], idOrClave: string, fallback?: string): string {
    const fromHardcoded = hardcodedBookLabel(idOrClave);
    if (fromHardcoded) return fromHardcoded;

    const needle = norm(idOrClave);
    if (!needle) return (fallback ?? idOrClave).trim();

    const meId = idFromClaveMe(idOrClave);
    const aliases = new Set<string>([needle]);
    if (meId) aliases.add(meId);

    for (const row of rows) {
        const id = norm(row.idMoextra ?? "");
        const clave = norm(row.clave ?? "");
        const desc = (row.Descripcion ?? "").trim();
        if (!desc) continue;
        if (aliases.has(id) || aliases.has(clave)) return desc;
        const claveMeId = idFromClaveMe(row.clave ?? "");
        if (claveMeId && aliases.has(claveMeId)) return desc;
    }

    const trimmed = idOrClave.trim();
    return (fallback ?? trimmed) || trimmed;
}
