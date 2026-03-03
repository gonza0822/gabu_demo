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
        const costCenters : CCostosModel[] = await this.prisma.cCostos.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
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
        });
        return {
            table: costCenters,
            fieldsManage: fieldsManage.map(field => {
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

    async insertOne(data: CCostosModel) : Promise<CCostosModel> {
        return await this.prisma.cCostos.create({
            data
        });
    }

    async updateOne(data: CCostosModel) : Promise<CCostosModel> {
        return await this.prisma.cCostos.update({
            where: {
                IdCencos: data.IdCencos
            },
            data: {
                Descripcion: data.Descripcion ?? null,
                IdResultado: data.IdResultado ?? null,
                IdAmajuste: data.IdAmajuste ?? null,
                Productivo: data.Productivo ?? null,
                idZona: data.idZona ?? null,
                codcia: data.codcia ?? null,
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