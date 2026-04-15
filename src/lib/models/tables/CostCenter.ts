import { CCostosModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type CostCenterData = AllData<CCostosModel>;

class CostCenter extends Table<
    CCostosModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<CostCenterData> {
        const [costCenters, fieldsManage, zones, accounts] = await Promise.all([
            this.prisma.cCostos.findMany(),
            this.prisma.converField.findMany({
                where: {
                    IdTabla: 'CCostos',
                    listShow: true,
                    OR: [
                        { idusuario: this.client },
                        { idusuario: 'default' }
                    ]
                },
                orderBy: {
                    lisordencampos: 'asc'
                }
            }),
            this.prisma.zonas.findMany({
                select: {
                    idZona: true,
                    descripcion: true,
                },
                orderBy: { idZona: 'asc' },
            }),
            this.prisma.cuentas.findMany({
                select: {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                },
                orderBy: { IdActivo: 'asc' },
            }),
        ]);

        const zoneRelations = [
            { id: "", description: "Ninguna" as string | null },
            ...zones.map((z) => ({
                id: z.idZona ?? "",
                description: (z.descripcion ?? z.idZona) ?? "",
            })),
        ];
        const resultAccountRelations = [
            { id: "", description: "Ninguna" as string | null },
            ...accounts
                .filter((acc) => String(acc.IdTipo ?? "").trim() === "0")
                .map((acc) => ({
                    id: acc.IdActivo ?? "",
                    description: (acc.Descripcion ?? acc.IdActivo) ?? "",
                })),
        ];
        return {
            table: costCenters,
            fieldsManage: fieldsManage.map(field => {
                const fieldId = String(field.IdCampo ?? "").toLowerCase();
                if(field.IdCampo === 'IdCencos'){
                    return {
                        ...field,
                        relation: [
                            { id: '0', description: 'id' },
                        ],
                        options: {
                            required: true
                        }
                    };
                }
                if(field.IdCampo === 'Descripcion'){
                    return {
                        ...field,
                        relation: [],
                        options: {
                            required: true
                        }
                    };
                }
                if (fieldId === "idzona") {
                    return {
                        ...field,
                        relation: zoneRelations,
                    };
                }
                if (fieldId === "idresultado") {
                    return {
                        ...field,
                        relation: resultAccountRelations,
                    };
                }
                return {
                    ...field,
                    relation: []
                }
            })
        };
    }

    async getOne(id: string) : Promise<CCostosModel | null> {
        return await this.prisma.cCostos.findUnique({
            where: {
                IdCencos: id
            }
        });
    }

    private normalizeProductivo(value: unknown): boolean {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (["true", "1", "si", "sí", "y", "yes", "on"].includes(normalized)) return true;
            if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
        }
        return false;
    }

    private normalizePayload(data: CCostosModel): CCostosModel {
        const normalizeNullableRef = (value: unknown): string | null => {
            const v = String(value ?? "").trim();
            if (v === "" || v === "0") return null;
            return v;
        };
        return {
            ...data,
            Productivo: this.normalizeProductivo((data as unknown as Record<string, unknown>).Productivo),
            IdResultado: normalizeNullableRef((data as unknown as Record<string, unknown>).IdResultado),
            idZona: normalizeNullableRef((data as unknown as Record<string, unknown>).idZona),
        };
    }

    async insertOne(data: CCostosModel) : Promise<CCostosModel> {
        const payload = this.normalizePayload(data);
        return await this.prisma.cCostos.create({
            data: payload
        });
    }

    async updateOne(data: CCostosModel) : Promise<CCostosModel> {
        const payload = this.normalizePayload(data);
        return await this.prisma.cCostos.update({
            where: {
                IdCencos: payload.IdCencos
            },
            data: {
                Descripcion: payload.Descripcion ?? null,
                IdResultado: payload.IdResultado ?? null,
                IdAmajuste: payload.IdAmajuste ?? null,
                Productivo: payload.Productivo,
                idZona: payload.idZona ?? null,
                codcia: payload.codcia ?? null,
            }
        });
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.cCostos.delete({
                where: {
                    IdCencos: id,
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async changeOrder(newOrder: ReOrderData) : Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];

        for (const item of newOrder) {
            const updated : ConverFieldModel = await this.prisma.converField.update({
                where: { 
                    IdTabla_IdCampo: {
                        IdTabla: item.tableId,
                        IdCampo: item.fieldId 
                    }  
                },
                data: { lisordencampos: item.order }
            });
            updatedRecords.push(updated);
        }

        return updatedRecords;
    }
    
    async getValidations() : Promise<Validation<CCostosModel>> {
        const validations = {} as Validation<CCostosModel>;

        return validations;
    }
}

export default CostCenter;