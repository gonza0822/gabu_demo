/** Payload de etiqueta QR de un bien. El escáner mobile parsea este texto. */
export const ASSET_QR_PREFIX = "GABU-BIEN:v1:";

export type BienIdKeys = {
    idCodigo: string;
    idSubien: string;
    idSubtra: string;
    idSufijo: string;
};

export function parseBienId(bienId: string): BienIdKeys | null {
    const parts = bienId.trim().split("-");
    if (parts.length !== 4 || parts.some((part) => part.length === 0)) return null;
    const [idCodigo, idSubien, idSubtra, idSufijo] = parts;
    return {
        idCodigo,
        idSubien: idSubien.padStart(3, "0"),
        idSubtra,
        idSufijo,
    };
}

export function buildAssetQrPayload(bienId: string): string {
    const keys = parseBienId(bienId);
    if (!keys) {
        throw new Error("Identificador de bien inválido.");
    }
    const normalized = `${keys.idCodigo}-${keys.idSubien}-${keys.idSubtra}-${keys.idSufijo}`;
    return `${ASSET_QR_PREFIX}${normalized}`;
}

export function parseAssetQrPayload(raw: string): { bienId: string } | null {
    const text = raw.trim();
    if (!text.startsWith(ASSET_QR_PREFIX)) return null;
    const bienId = text.slice(ASSET_QR_PREFIX.length).trim();
    if (!parseBienId(bienId)) return null;
    return { bienId };
}
