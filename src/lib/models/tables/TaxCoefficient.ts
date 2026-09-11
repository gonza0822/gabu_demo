import { CoefImpositivosModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';
import { parseStringDate, parseDateString } from '@/util/date/parseDate';
import { converFieldPk } from "@/lib/models/converFieldKeys";

type taxCoeffWithStringDate = Omit<CoefImpositivosModel, "fecha"> & { fecha: string };

export type tacCoeffData = AllData<taxCoeffWithStringDate>;

class TaxCoefficient extends Table<
    taxCoeffWithStringDate,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<tacCoeffData> {
        const taxCoeffs : CoefImpositivosModel[] = await this.prisma.coefImpositivos.findMany();
        const serializedtaxCoeffs = taxCoeffs.map(item => ({
            ...item,
            fecha: parseStringDate(item.fecha),
        }));
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'CoefImpositivos',
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
            table: serializedtaxCoeffs,
            fieldsManage: fieldsManage.map(field => {
                if(field.IdCampo === 'fecha'){
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

    async getOne(id: string) : Promise<taxCoeffWithStringDate | null> {
        const taxCoeff = await this.prisma.coefImpositivos.findUnique({
            where: {
                fecha: parseDateString(id)
            }
        });

        return taxCoeff ? { ...taxCoeff, fecha: parseStringDate(taxCoeff.fecha) } : null;
    }

    async insertOne(data: taxCoeffWithStringDate) : Promise<taxCoeffWithStringDate> {
        const parseFloatEs = (value: unknown): number | null => {
            if (value === null || value === undefined || value === '') return null;
            const raw = String(value).trim();
            const normalized = raw.includes(',')
                ? raw.replace(/\./g, '').replace(',', '.')
                : raw;
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const createdTaxCoeff = await this.prisma.coefImpositivos.create({
            data:{
                fecha: parseDateString(data.fecha),
                Coeficiente: parseFloatEs(data.Coeficiente),
            }
        });
        return { ...createdTaxCoeff, fecha: parseStringDate(createdTaxCoeff.fecha) };
    }

    async updateOne(data: taxCoeffWithStringDate) : Promise<taxCoeffWithStringDate> {
        const parseFloatEs = (value: unknown): number | null => {
            if (value === null || value === undefined || value === '') return null;
            const raw = String(value).trim();
            const normalized = raw.includes(',')
                ? raw.replace(/\./g, '').replace(',', '.')
                : raw;
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const updatedQuotation = await this.prisma.coefImpositivos.update({
            where: {
                fecha: parseDateString(data.fecha)
            },
            data: {
                Coeficiente: parseFloatEs(data.Coeficiente),
            }
        });

        return { ...updatedQuotation, fecha: parseStringDate(updatedQuotation.fecha) };
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.coefImpositivos.delete({
                where: {
                    fecha: parseDateString(id)
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
                where: converFieldPk(item.tableId, item.fieldId),
                data: { lisordencampos: item.order }
            });
            updatedRecords.push(updated);
        }

        return updatedRecords;
    }
    
    async getValidations() : Promise<Validation<CoefImpositivosModel>> {
        const validations = {} as Validation<CoefImpositivosModel>;

        return validations;
    }
}

export default TaxCoefficient;