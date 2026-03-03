import { ZonasModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';

export type GeographicLocationData = AllData<ZonasModel>;

class GeographicLocation extends Table<
    ZonasModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<GeographicLocationData> {
        const costCenters : ZonasModel[] = await this.prisma.zonas.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'Zonas',
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
                if(field.IdCampo === 'idZona'){
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

    async getOne(id: string) : Promise<ZonasModel | null> {
        return await this.prisma.zonas.findUnique({
            where: {
                idZona: id
            }
        });
    }

    async insertOne(data: ZonasModel) : Promise<ZonasModel> {
        return await this.prisma.zonas.create({
            data
        });
    }

    async updateOne(data: ZonasModel) : Promise<ZonasModel> {
        return await this.prisma.zonas.update({
            where: {
                idZona: data.idZona
            },
            data: {
                descripcion: data.descripcion ?? null,
                CAMPO2: data.CAMPO2 ?? null,
            }
        });
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.zonas.delete({
                where: {
                    idZona: id,
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
    
    async getValidations() : Promise<Validation<ZonasModel>> {
        const validations = {} as Validation<ZonasModel>;

        return validations;
    }
}

export default GeographicLocation;