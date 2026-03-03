import { CotextranjeraModel, ConverFieldModel, GruposModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';
import { parseStringDate, parseDateString } from '@/util/date/parseDate';

type QuotationMEWithStringDate = Omit<CotextranjeraModel, "Fecha"> & { Fecha: string };

export type GroupData = AllData<QuotationMEWithStringDate>;

class QuotationME extends Table<
    QuotationMEWithStringDate,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<GroupData> {
        const quotationsME : CotextranjeraModel[] = await this.prisma.cotextranjera.findMany();
        const serializedQuotationsME = quotationsME.map(item => ({
            ...item,
            Fecha: parseStringDate(item.Fecha),
        }));
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'Cotextranjera',
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
        const extraCurrencies = await this.prisma.moextra.findMany({
            where: {
                simula: false
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
            table: serializedQuotationsME,
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
                if(field.IdCampo === 'idMoextra'){
                    return {
                        ...field,
                        relation: [
                            ...extraCurrencies.map(currency => {
                                return {
                                    id: currency.idMoextra!,
                                    description: currency.Descripcion
                                }
                            })
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

    async getOne(id: string) : Promise<QuotationMEWithStringDate | null> {
        const quotationME = await this.prisma.cotextranjera.findMany({
            where: {
                Fecha: id
            }
        });

        return quotationME.length > 0 ? { ...quotationME[0], Fecha: parseStringDate(quotationME[0].Fecha) } : null;
    }

    async insertOne(data: QuotationMEWithStringDate) : Promise<QuotationMEWithStringDate> {
        const createdQuotation = await this.prisma.cotextranjera.create({
            data:{
                ...data,
                cotizacion: Number(data.cotizacion) ?? null,
                Fecha: parseDateString(data.Fecha),
            }
        });
        return { ...createdQuotation, Fecha: parseStringDate(createdQuotation.Fecha) };
    }

    async updateOne(data: QuotationMEWithStringDate) : Promise<QuotationMEWithStringDate> {
        const updatedQuotation = await this.prisma.cotextranjera.update({
            where: {
                Fecha_idMoextra: {
                    Fecha: parseDateString(data.Fecha),
                    idMoextra: data.idMoextra
                }
            },
            data: {
                cotizacion: Number(data.cotizacion) ?? null,
            }
        });

        return { ...updatedQuotation, Fecha: parseStringDate(updatedQuotation.Fecha) };
    }

    async deleteOne(id: string, secId?: string) : Promise<boolean> {
        try {
            await this.prisma.cotextranjera.delete({
                where: {
                    Fecha_idMoextra: {
                        Fecha: parseDateString(id),
                        idMoextra: secId!
                    }
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
    
    async getValidations() : Promise<Validation<CotextranjeraModel>> {
        const validations = {} as Validation<CotextranjeraModel>;

        return validations;
    }
}

export default QuotationME;