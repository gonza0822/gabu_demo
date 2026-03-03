import { umedidaModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type UMedidaData = AllData<umedidaModel>;

class MeasurementUnit extends Table<
    umedidaModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<UMedidaData> {
        const costCenters : umedidaModel[] = await this.prisma.umedida.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'umedida',
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
                if(field.IdCampo === 'IDUMEDIDA'){
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

    async getOne(id: string) : Promise<umedidaModel | null> {
        return await this.prisma.umedida.findUnique({
            where: {
                IDUMEDIDA: id
            }
        });
    }

    async insertOne(data: umedidaModel) : Promise<umedidaModel> {
        return await this.prisma.umedida.create({
            data
        });
    }

    async updateOne(data: umedidaModel) : Promise<umedidaModel> {
        return await this.prisma.umedida.update({
            where: {
                IDUMEDIDA: data.IDUMEDIDA
            },
            data: {
                DESCRIPCION: data.DESCRIPCION ?? null,
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
    
    async getValidations() : Promise<Validation<umedidaModel>> {
        const validations = {} as Validation<umedidaModel>;

        return validations;
    }
}

export default MeasurementUnit;