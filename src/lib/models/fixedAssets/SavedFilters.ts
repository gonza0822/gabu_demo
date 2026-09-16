import { getPrisma } from "@/lib/prisma/prisma";
import { areFiltersEqual, EMPTY_FILTERS, parseSavedFilterValues, type FilterValues, type SavedFilterRow } from "@/lib/fixedAssets/filterValues";

export type { SavedFilterRow };

export class DuplicateFilterParamsError extends Error {
    readonly existingName: string;

    constructor(existingName: string) {
        super(`Ya existe un filtro con estos mismos criterios (“${existingName}”).`);
        this.name = "DuplicateFilterParamsError";
        this.existingName = existingName;
    }
}

function parseJsonColumn(filtrosJson: string): FilterValues {
    try {
        return parseSavedFilterValues(JSON.parse(filtrosJson) as unknown);
    } catch {
        return { ...EMPTY_FILTERS };
    }
}

export default class SavedFilters {
    private client: string;
    private userId: string;

    constructor(client: string, userId: string) {
        this.client = client;
        this.userId = userId.trim();
    }

    async list(): Promise<SavedFilterRow[]> {
        const prisma = getPrisma(this.client);
        const rows = await prisma.filtrosBienesUso.findMany({
            where: { activo: true },
            orderBy: { nombre: "asc" },
            select: { id: true, nombre: true, filtrosJson: true },
        });
        return rows.map((row) => ({
            id: row.id,
            nombre: row.nombre,
            filtros: parseJsonColumn(row.filtrosJson),
        }));
    }

    async save(nombre: string, filtros: FilterValues): Promise<SavedFilterRow> {
        const prisma = getPrisma(this.client);
        const trimmed = nombre.trim();
        if (!trimmed) {
            throw new Error("El nombre del filtro es obligatorio.");
        }
        if (trimmed.length > 80) {
            throw new Error("El nombre no puede superar 80 caracteres.");
        }
        const payload = JSON.stringify(filtros);

        const activeRows = await prisma.filtrosBienesUso.findMany({
            where: { activo: true },
            select: { id: true, nombre: true, filtrosJson: true },
        });
        const existing = activeRows.find((row) => row.nombre === trimmed);
        const duplicate = activeRows.find((row) => {
            if (existing && row.id === existing.id) return false;
            return areFiltersEqual(parseJsonColumn(row.filtrosJson), filtros);
        });
        if (duplicate) {
            throw new DuplicateFilterParamsError(duplicate.nombre);
        }

        if (existing) {
            const updated = await prisma.filtrosBienesUso.update({
                where: { id: existing.id },
                data: {
                    filtrosJson: payload,
                    fecModi: new Date(),
                    idUsuarioModi: this.userId,
                },
            });
            return { id: updated.id, nombre: updated.nombre, filtros };
        }

        const created = await prisma.filtrosBienesUso.create({
            data: {
                idUsuario: this.userId,
                nombre: trimmed,
                filtrosJson: payload,
                activo: true,
                fecAlta: new Date(),
                idUsuarioAlta: this.userId,
            },
        });
        return { id: created.id, nombre: created.nombre, filtros };
    }

    async remove(id: number): Promise<void> {
        const prisma = getPrisma(this.client);
        const existing = await prisma.filtrosBienesUso.findFirst({
            where: { id, activo: true },
        });
        if (!existing) {
            throw new Error("No se encontró el filtro.");
        }
        await prisma.filtrosBienesUso.update({
            where: { id: existing.id },
            data: {
                activo: false,
                fecModi: new Date(),
                idUsuarioModi: this.userId,
            },
        });
    }
}
