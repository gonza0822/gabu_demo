import { PlantasModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type PlantData = AllData<PlantasModel>;

class Plant extends Table<
    PlantasModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<PlantData> {
        const costCenters : PlantasModel[] = await this.prisma.plantas.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'Plantas',
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
                if(field.IdCampo === 'IdPlanta'){
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

    async getOne(id: string) : Promise<PlantasModel | null> {
        return await this.prisma.plantas.findUnique({
            where: {
                IdPlanta: id
            }
        });
    }

    async insertOne(data: PlantasModel) : Promise<PlantasModel> {
        return await this.prisma.plantas.create({
            data
        });
    }

    async updateOne(data: PlantasModel) : Promise<PlantasModel> {
        return await this.prisma.plantas.update({
            where: {
                IdPlanta: data.IdPlanta
            },
            data: {
                Descripcion: data.Descripcion ?? null,
            }
        });
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.plantas.delete({
                where: {
                    IdPlanta: id,
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
    
    async getValidations() : Promise<Validation<PlantasModel>> {
        const validations = {} as Validation<PlantasModel>;

        return validations;
    }
}

export default Plant;