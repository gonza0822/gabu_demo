import { UNegocioModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type BusinessUnitData = AllData<UNegocioModel>;

class BusinessUnit extends Table<
    UNegocioModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<BusinessUnitData> {
        const costCenters : UNegocioModel[] = await this.prisma.uNegocio.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'UNegocio',
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
                if(field.IdCampo === 'IdUNegocio'){
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

    async getOne(id: string) : Promise<UNegocioModel | null> {
        return await this.prisma.uNegocio.findUnique({
            where: {
                IdUNegocio: id
            }
        });
    }

    async insertOne(data: UNegocioModel) : Promise<UNegocioModel> {
        return await this.prisma.uNegocio.create({
            data
        });
    }

    async updateOne(data: UNegocioModel) : Promise<UNegocioModel> {
        return await this.prisma.uNegocio.update({
            where: {
                IdUNegocio: data.IdUNegocio
            },
            data: {
                Descripcion: data.Descripcion ?? null,
            }
        });
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.uNegocio.delete({
                where: {
                    IdUNegocio: id,
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
    
    async getValidations() : Promise<Validation<UNegocioModel>> {
        const validations = {} as Validation<UNegocioModel>;

        return validations;
    }
}

export default BusinessUnit;