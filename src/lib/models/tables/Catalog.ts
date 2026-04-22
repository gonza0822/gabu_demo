import { tipifisModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from "@/lib/prisma/prisma";
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from "@/generated/prisma/client";

export type CatalogData = AllData<tipifisModel>;

class Catalog extends Table<
    tipifisModel,
    ReOrderData
> {
    prisma: PrismaClient;

    constructor(client: string) {
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll(): Promise<CatalogData> {
        const records: tipifisModel[] = await this.prisma.tipifis.findMany();
        const fieldsManage: ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: "tipifis",
                listShow: true,
                OR: [
                    { idusuario: this.client },
                    { idusuario: "default" }
                ]
            },
            orderBy: {
                lisordencampos: "asc"
            }
        });

        return {
            table: records,
            fieldsManage: fieldsManage.map((field) => {
                if (field.IdCampo === "idDescripcion") {
                    return {
                        ...field,
                        relation: [{ id: "0", description: "id" }],
                        options: {
                            required: true
                        }
                    };
                }

                return {
                    ...field,
                    relation: [],
                    options: {
                        required: true
                    }
                };
            })
        };
    }

    async getOne(id: string): Promise<tipifisModel | null> {
        return await this.prisma.tipifis.findUnique({
            where: {
                idDescripcion: id
            }
        });
    }

    async insertOne(data: tipifisModel): Promise<tipifisModel> {
        return await this.prisma.tipifis.create({
            data
        });
    }

    async updateOne(data: tipifisModel): Promise<tipifisModel> {
        return await this.prisma.tipifis.update({
            where: {
                idDescripcion: data.idDescripcion
            },
            data: {
                descripcion: data.descripcion ?? null
            }
        });
    }

    async deleteOne(id: string): Promise<boolean> {
        try {
            await this.prisma.tipifis.delete({
                where: {
                    idDescripcion: id
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async changeOrder(newOrder: ReOrderData): Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];

        for (const item of newOrder) {
            const updated: ConverFieldModel = await this.prisma.converField.update({
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

    async getValidations(): Promise<Validation<tipifisModel>> {
        const validations = {} as Validation<tipifisModel>;
        return validations;
    }
}

export default Catalog;
