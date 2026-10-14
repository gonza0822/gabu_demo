import { getPrisma } from "@/lib/prisma/prisma";
import { parseBienId, type BienIdKeys } from "@/lib/fixedAssets/assetQr";
import type { InventarioBienRow } from "@/lib/fixedAssets/scanAssetSummary";

export type { InventarioBienRow };

export const INVENTARIO_ESTADO_CORRECTO = "correcto";

function formatFecEstado(value: Date): string {
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function toRow(keys: BienIdKeys, estado: string, fecEstado: Date, idUsuario: string): InventarioBienRow {
    const bienId = `${keys.idCodigo}-${keys.idSubien}-${keys.idSubtra}-${keys.idSufijo}`;
    return {
        bienId,
        estado,
        fecEstado: fecEstado.toISOString(),
        fecEstadoLabel: formatFecEstado(fecEstado),
        idUsuario,
    };
}

export default class InventarioBien {
    constructor(
        private client: string,
        private userId: string
    ) {}

    async getLast(bienId: string): Promise<InventarioBienRow | null> {
        const keys = parseBienId(bienId);
        if (!keys) {
            throw new Error("Identificador de bien inválido.");
        }
        const prisma = getPrisma(this.client);
        const row = await prisma.inventarioBien.findFirst({
            where: {
                idCodigo: keys.idCodigo,
                idSubien: keys.idSubien,
                idSubtra: keys.idSubtra,
                idSufijo: keys.idSufijo,
            },
            orderBy: { fecEstado: "desc" },
        });
        if (!row) return null;
        return toRow(keys, row.estado, row.fecEstado, row.idUsuario);
    }

    async confirm(bienId: string): Promise<InventarioBienRow> {
        const keys = parseBienId(bienId);
        if (!keys) {
            throw new Error("Identificador de bien inválido.");
        }
        const prisma = getPrisma(this.client);
        const created = await prisma.inventarioBien.create({
            data: {
                idCodigo: keys.idCodigo,
                idSubien: keys.idSubien,
                idSubtra: keys.idSubtra,
                idSufijo: keys.idSufijo,
                estado: INVENTARIO_ESTADO_CORRECTO,
                fecEstado: new Date(),
                idUsuario: this.userId,
            },
        });
        return toRow(keys, created.estado, created.fecEstado, created.idUsuario);
    }
}
