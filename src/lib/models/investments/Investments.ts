import { ConverFieldModel } from "@/generated/prisma/models";
import { PrismaClient } from "@/generated/prisma/client";
import { getCorePrisma } from "@/lib/prisma/corePrisma";
import { getPrisma } from "@/lib/prisma/prisma";
import { ReOrderData } from "@/lib/models/tables/Table";

export type InvestmentType = "projects" | "workOrders" | "charges";

export type InvestmentsData = {
    table: Record<string, unknown>[];
    fieldsManage: ConverFieldModel[];
};

const TABLE_ID_BY_TYPE: Record<InvestmentType, string> = {
    projects: "Proyectos",
    workOrders: "OTrabajo",
    charges: "Cargos",
};

class Investments {
    prisma: PrismaClient;
    corePrisma: PrismaClient;
    tableId: string;
    type: InvestmentType;

    constructor(client: string, type: InvestmentType) {
        this.prisma = getPrisma(client);
        this.corePrisma = getCorePrisma(client);
        this.type = type;
        this.tableId = TABLE_ID_BY_TYPE[type];
    }

    private normalizeForJson(value: unknown): unknown {
        if (typeof value === "bigint") return value.toString();
        if (value instanceof Date) return value;
        if (Array.isArray(value)) return value.map((item) => this.normalizeForJson(item));
        if (value && typeof value === "object") {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                out[k] = this.normalizeForJson(v);
            }
            return out;
        }
        return value;
    }

    private buildFieldsFromRows(
        rows: Record<string, unknown>[],
        fieldsFromDb: ConverFieldModel[]
    ): ConverFieldModel[] {
        const sampleRow = rows[0];
        if (!sampleRow) return fieldsFromDb;

        const rowKeys = Object.keys(sampleRow);
        const fieldsByExactId = new Map<string, ConverFieldModel>();
        for (const field of fieldsFromDb) {
            fieldsByExactId.set(field.IdCampo, field);
        }

        const generated = rowKeys.map((key, index) => {
            const mapped = fieldsByExactId.get(key);
            const browNombre =
                this.type === "workOrders" && key === "cdobra"
                    ? "Cd. obra"
                    : key;
            return {
                IdTabla: this.tableId,
                IdCampo: key,
                BrowNombre: browNombre,
                browformat: mapped?.browformat ?? null,
                listShow: mapped?.listShow ?? true,
                lisordencampos: mapped?.lisordencampos ?? index,
                idIdioma: mapped?.idIdioma ?? null,
                idusuario: mapped?.idusuario ?? null,
            } as ConverFieldModel;
        });

        return generated.sort(
            (a, b) => (a.lisordencampos ?? Number.MAX_SAFE_INTEGER) - (b.lisordencampos ?? Number.MAX_SAFE_INTEGER)
        );
    }

    private async getRows(): Promise<Record<string, unknown>[]> {
        if (this.type === "projects") {
            return this.corePrisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `SELECT * FROM [dbo].[TBLDATOSOBRAS]`
            );
        }
        if (this.type === "workOrders") {
            return this.corePrisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `SELECT
                    b.*,
                    o.[cdObra] AS cdobra
                 FROM [dbo].[TBLBUDGETOBRAS] b
                 LEFT JOIN [PROD_CORE].[dbo].[TBLDATOSOBRAS] o ON o.[idObra] = b.[idObra]`
            );
        }
        return this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM [dbo].[cargosmagic]`
        );
    }

    async getAll(): Promise<InvestmentsData> {
        const [table, fieldsFromDb] = await Promise.all([
            this.getRows(),
            this.prisma.converField.findMany({
                where: { IdTabla: this.tableId },
                orderBy: { lisordencampos: "asc" },
            }),
        ]);

        const fieldsManage = this.buildFieldsFromRows(table, fieldsFromDb);

        const normalizedTable = table.map((row) => this.normalizeForJson(row) as Record<string, unknown>);
        return { table: normalizedTable, fieldsManage };
    }

    async setListShow(fieldId: string, listShow: boolean): Promise<ConverFieldModel> {
        return this.prisma.converField.upsert({
            where: {
                IdTabla_IdCampo: {
                    IdTabla: this.tableId,
                    IdCampo: fieldId,
                },
            },
            update: { listShow },
            create: {
                IdTabla: this.tableId,
                IdCampo: fieldId,
                BrowNombre: fieldId,
                browformat: null,
                listShow,
                lisordencampos: null,
                idIdioma: null,
                idusuario: null,
            },
        });
    }

    async changeOrder(newOrder: ReOrderData): Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];
        for (const item of newOrder) {
            const updated = await this.prisma.converField.update({
                where: {
                    IdTabla_IdCampo: {
                        IdTabla: item.tableId,
                        IdCampo: item.fieldId,
                    },
                },
                data: { lisordencampos: item.order },
            });
            updatedRecords.push(updated);
        }
        return updatedRecords;
    }
}

export default Investments;
