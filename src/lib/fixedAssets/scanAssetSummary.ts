export type AssetScanSummary = {
    bienId: string;
    descripcion: string;
    idPlanta: string;
    idZona: string;
    idCencos: string;
    fecbajLabel: string;
    dadoDeBaja: boolean;
};

export type InventarioBienRow = {
    bienId: string;
    estado: string;
    fecEstado: string;
    fecEstadoLabel: string;
    idUsuario: string;
};

function pick(row: Record<string, unknown>, names: string[]): unknown {
    for (const name of names) {
        if (row[name] != null && row[name] !== "") return row[name];
        const found = Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase());
        if (found != null && row[found] != null && row[found] !== "") return row[found];
    }
    const lowered = names.map((n) => n.toLowerCase());
    const suffix = Object.keys(row).find((key) => {
        const tail = key.split(".").pop()?.toLowerCase() ?? "";
        return lowered.includes(tail) && row[key] != null && row[key] !== "";
    });
    return suffix ? row[suffix] : null;
}

function isRealBajaDate(val: unknown): boolean {
    if (val == null || val === "") return false;
    if (val instanceof Date) return !isNaN(val.getTime()) && val.getFullYear() > 1900;
    const s = String(val).trim();
    if (!s) return false;
    if (/^0+$/.test(s) || s.startsWith("1900-01-01") || s.startsWith("0001")) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const year = Number(s.slice(0, 4));
        return year > 1900;
    }
    return false;
}

function formatFecbaj(val: unknown): string {
    if (!isRealBajaDate(val)) return "";
    if (val instanceof Date) {
        return new Intl.DateTimeFormat("es-AR").format(val);
    }
    const s = String(val).trim();
    const day = s.slice(0, 10);
    const [y, m, d] = day.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return s;
}

export function buildAssetScanSummary(bienId: string, row: Record<string, unknown>): AssetScanSummary {
    const fecbaj = pick(row, ["fecbaj", "FecBaj", "me01.fecbaj", "me01.FecBaj"]);
    return {
        bienId,
        descripcion: String(pick(row, ["descripcion", "cabecera.descripcion"]) ?? "").trim(),
        idPlanta: String(pick(row, ["idPlanta", "IdPlanta"]) ?? "").trim(),
        idZona: String(pick(row, ["idZona", "IdZona"]) ?? "").trim(),
        idCencos: String(pick(row, ["idCencos", "IdCencos"]) ?? "").trim(),
        fecbajLabel: formatFecbaj(fecbaj),
        dadoDeBaja: isRealBajaDate(fecbaj),
    };
}
