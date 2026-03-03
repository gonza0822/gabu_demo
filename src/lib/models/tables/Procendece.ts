import { OrigenesModel, ConverFieldModel, CCostosModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type ProcedenceData = AllData<OrigenesModel>;

class Procedence extends Table<
    OrigenesModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<ProcedenceData> {
        const procedences : OrigenesModel[] = await this.prisma.origenes.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'Origenes',
                listShow: true,
                OR: [
                    { idusuario: this.client },
                    { idusuario: 'default' }
                ]
            },
            orderBy: {
                lisordencampos: 'asc'
            }
        });
        return {
            table: procedences,
            fieldsManage: fieldsManage.map(field => {
                if(field.IdCampo === 'IdOrigen'){
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
                return {
                    ...field,
                    relation: [],
                    options: {
                        required: true
                    }
                }
            })
        };
    }

    async getOne(id: string) : Promise<OrigenesModel | null> {
        return await this.prisma.origenes.findUnique({
            where: {
                IdOrigen: id
            }
        });
    }

    async insertOne(data: OrigenesModel) : Promise<OrigenesModel> {
        return await this.prisma.origenes.create({
            data
        });
    }

    async updateOne(data: OrigenesModel) : Promise<OrigenesModel> {
        return await this.prisma.origenes.update({
            where: {
                IdOrigen: data.IdOrigen
            },
            data: {
                Descripcion: data.Descripcion ?? null,
            }
        });
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.origenes.delete({
                where: {
                    IdOrigen: id,
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

export default Procedence;