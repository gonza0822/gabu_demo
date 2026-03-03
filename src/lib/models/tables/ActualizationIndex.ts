import { MayoristaModel, ConverFieldModel, CCostosModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';
import { parseStringDate, parseDateString } from '@/util/date/parseDate';

type ActualizationIndexWithStringDate = Omit<MayoristaModel, "Fecha"> & { Fecha: string };

export type ActualizationIndexData = AllData<ActualizationIndexWithStringDate>;

class ActualizationIndex extends Table<
    ActualizationIndexWithStringDate,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<ActualizationIndexData> {
        const actualizationIndexes : MayoristaModel[] = await this.prisma.mayorista.findMany();
        const serializedActualizationIndexes = actualizationIndexes.map(item => ({
            ...item,
            Fecha: parseStringDate(item.Fecha),
        }));
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'Mayorista',
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
        const defaultDate : string | null = await this.prisma.parametros.findFirst({
            where: {
                idmoextra: '01'
            },
            select: {
                fecpro: true
            }
        }).then(param => param && parseStringDate(param.fecpro!));

        return {
            table: serializedActualizationIndexes,
            fieldsManage: fieldsManage.map(field => {
                if(field.IdCampo === 'Fecha'){
                    return {
                        ...field,
                        relation: [
                            { id: '0', description: 'id' },
                        ],
                        options: {
                            required: true,
                            isDate: true,
                            defaultValue: defaultDate
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

    async getOne(id: string) : Promise<ActualizationIndexWithStringDate | null> {
        const actualizationIndex = await this.prisma.mayorista.findUnique({
            where: {
                Fecha: parseDateString(id)
            }
        });

        return actualizationIndex ? {
            ...actualizationIndex,
            Fecha: parseStringDate(actualizationIndex.Fecha),
        } : null;
    }

    async insertOne(data: ActualizationIndexWithStringDate) : Promise<ActualizationIndexWithStringDate> {
        const actualizationIndex = await this.prisma.mayorista.create({
            data: {
                ...data,
                Fecha: parseDateString(data.Fecha),
                Indice: Number(data.Indice) ?? null,
                Otro: Number(data.Otro) ?? null
            }
        });
        return {
            ...actualizationIndex,
            Fecha: parseStringDate(actualizationIndex.Fecha),
        };
    }

    async updateOne(data: ActualizationIndexWithStringDate) : Promise<ActualizationIndexWithStringDate> {
        const actualizationIndex = await this.prisma.mayorista.update({
            where: {
                Fecha: parseDateString(data.Fecha)
            },
            data: {
                Indice: Number(data.Indice) ?? null,
                Otro: Number(data.Otro) ?? null 
            }
        });

        return {
            ...actualizationIndex,
            Fecha: parseStringDate(actualizationIndex.Fecha),
        };
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.mayorista.delete({
                where: {
                    Fecha: parseDateString(id),
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
    
    async getValidations() : Promise<Validation<MayoristaModel>> {
        const validations = {} as Validation<MayoristaModel>;

        return validations;
    }
}

export default ActualizationIndex;