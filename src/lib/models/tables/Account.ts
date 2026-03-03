import { CuentasModel, InternaModel, ConverFieldModel, ctaVidautilModel, GruposModel, moextraModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';
import { fix } from "mssql";

export type AccountsData = AllData<CuentasModel>;

class Account extends Table<
    CuentasModel,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<AccountsData> {
        const accounts : CuentasModel[] = await this.prisma.cuentas.findMany();
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { IdTabla: 'Cuentas' },
                        ]
                    },
                    {
                        OR: [
                            { idusuario: this.client },
                            { idusuario: 'default' }
                        ]
                    }
                ],
                listShow: true,
            },
            orderBy: {
                lisordencampos: 'asc'
            }
        });
        const tipes : InternaModel[] = await this.prisma.interna.findMany({
            where: {
                Tipo: 'TIPCTA'
            }
        });
        const amortCodes : InternaModel[] = await this.prisma.interna.findMany({
            where: {
                Tipo: 'CODAMO'
            }
        });

        const updatedFieldsManage = fieldsManage.map(field => {
            if(field.IdCampo === 'IdTipo'){
                return {
                    ...field,
                    relation: tipes.map(tipe => {
                        return {
                            id: tipe.IdInterno!,
                            description: tipe.Descripcion
                        }
                    }),
                    options: {
                        required: true
                    }
                }
            } else if(field.IdCampo === 'IdCodamo'){
                return {
                    ...field,
                    relation: amortCodes.map(code => {
                        return {
                            id: code.IdInterno!,
                            description: code.Descripcion
                        }
                    }),
                    options: {
                        required: true
                    }
                }
            } else if(field.IdCampo === 'Descripcion'){ 
                return {
                    ...field,
                    relation: [],
                    options: {
                        required: true
                    }
                }
            } else if(field.IdCampo === 'IdActivo'){ 
                return {
                    ...field,
                    relation: [
                        { id: '0', description: 'id' },
                    ],
                    options: {
                        required: true
                    }
                }
            } else if(field.IdCampo === 'IdAmAcumulada' || field.IdCampo === 'IdResultado' || field.IdCampo === 'IdReserva' || field.IdCampo === 'idamajuste'){
                return {
                    ...field,
                    relation: accounts.map((account, index) => {
                        if(index === 0) {
                            return {
                                id: '0',
                                description: 'Ninguna'
                            };
                        } 
                        if(account.IdTipo === '0'){
                            return {
                                id: account.IdActivo!,
                                description: account.Descripcion
                            };
                        }
                    }).filter(acc => acc !== undefined)
                }
            }
            return {
                ...field,
                relation: []
            };

        });
        const usefulLivesAndGrupsFields : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'ctaVidautil',
                listShow: true,
                OR: [
                    { idusuario: this.client },
                    { idusuario: 'default' }
                ],
            },
            orderBy: {
                lisordencampos: 'asc'
            }
        });
        const groups = await this.prisma.grupos.findMany();
        const extraCurrencies = await this.prisma.moextra.findMany({
            where: {
                simula: false
            }
        });
        const updatedUsefulLivesAndGrupsFields = usefulLivesAndGrupsFields.map(field => {
            if(field.IdCampo === 'idMoextra'){
                return {
                    ...field,
                    relation: [
                        ...extraCurrencies.map(currency => {
                            return {
                                id: currency.idMoextra!,
                                description: currency.Descripcion
                            }
                        }),
                        { id: 'ML', description: 'Moneda Local' },
                        { id: 'IM', description: 'Impuestos' }
                    ],
                    options: {
                        maxRows: true,
                        fixed: true,
                    }
                };
            }
            if(field.IdCampo === 'idGrupo'){
                return {
                    ...field,
                    relation: groups.map(group => {
                        return {
                            id: group.IdGrupo!,
                            description: group.Descripcion
                        }
                    })
                };
            }
            if(field.IdCampo === 'idActivo'){ 
                return {
                    ...field,
                    relation: [],
                    options: {
                        hidden: true
                    }
                };
            }
            return {
                ...field,
                relation: []
            }
        });

        return {
            table: accounts,
            fieldsManage: updatedFieldsManage,
            secondaryTable: {
                fieldsManage: updatedUsefulLivesAndGrupsFields
            }
        };
    }

    async getOne(id: string) : Promise<{
        mainTableData: CuentasModel,
        secondaryTableData: ctaVidautilModel[]
    } | null> {
        const account : CuentasModel | null = await this.prisma.cuentas.findUnique({
            where: {
                IdActivo: id,
            }
        })

        const usefulLivesAndGroups : ctaVidautilModel[] = await this.prisma.ctaVidautil.findMany({
            where: {
                idActivo: id,
            }
        }); 

        return {
            mainTableData: account!,
            secondaryTableData: usefulLivesAndGroups
        };
    }

    async insertOne(data: CuentasModel, secondaryData: ctaVidautilModel[]) :  Promise<CuentasModel> {
        try {
            const account = await this.prisma.$transaction(async (prisma) => {
                const createdAccount : CuentasModel = await prisma.cuentas.create({
                    data
                })

                await Promise.all(secondaryData.map(async (item) => {
                    return await prisma.ctaVidautil.create({
                        data: {
                            idActivo: data.IdActivo,
                            idMoextra: item.idMoextra,
                            vidautil: Number(item.vidautil) ?? null,
                            idGrupo: item.idGrupo,
                        }
                    });
                }));

                 return createdAccount;
            });

            return account;
        } catch (error) {
            throw error;
        }
    }

    async updateOne(data: CuentasModel, secondaryData: ctaVidautilModel[]): Promise<CuentasModel> {
        try {
            const account = await this.prisma.$transaction(async (prisma) => {
                const updatedAccount: CuentasModel = await this.prisma.cuentas.update({
                    where: {
                        IdActivo: data.IdActivo,
                    },
                    data: {
                        Descripcion: data.Descripcion ?? null,
                        IdTipo: data.IdTipo ?? null,
                        Valres: Number(data.Valres) ?? null,
                        IdCodamo: data.IdCodamo ?? null,
                        CVidautil: data.CVidautil ?? null,
                        IVidautil: data.IVidautil ?? null,
                        IdAmAcumulada: data.IdAmAcumulada ?? null,
                        IdResultado: data.IdResultado ?? null,
                        IdReserva: data.IdReserva ?? null,
                        idamajuste: data.idamajuste ?? null,
                        IdGrupoA: data.IdGrupoA ?? null,
                        IdGrupoI: data.IdGrupoI ?? null,
                    }
                });

                await Promise.all(secondaryData.map(async (item) => {
                    await prisma.ctaVidautil.updateMany({
                        where: {
                            idActivo: item.idActivo,
                            idMoextra: item.idMoextra,
                        },
                        data: {
                            vidautil: Number(item.vidautil) ?? null,
                            idGrupo: item.idGrupo,
                        }
                    });
                }));

                return updatedAccount;
            });

            return account;
        } catch (error) {
            throw error;
        }
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.$transaction(async (prisma) => {
                await prisma.cuentas.delete({
                    where: {
                        IdActivo: id,
                    }
                });

                await prisma.ctaVidautil.deleteMany({
                    where: {
                        idActivo: id,
                    }
                });
            });
            return true;
        } catch (error) {
            throw error;
        }
    }

    async changeOrder(newOrder : ReOrderData) : Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];

        for (const item of newOrder) {
            const updated : ConverFieldModel = await this.prisma.converField.update({
                where: { 
                    IdTabla_IdCampo: {
                        IdTabla: item.tableId,
                        IdCampo: item.fieldId,
                    }  
                },
                data: { lisordencampos: item.order }
            });
            updatedRecords.push(updated);
        }

        return updatedRecords;
    }

    async getValidations() : Promise<Validation<CuentasModel>> {
        const validations = {
            IdTipo: {
                "0": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    valres: true,
                    vidautil: {
                        available: false,
                        value: '0'
                    }
                },
                "6": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    valres: true,
                    vidautil: true,
                },
                "7": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    valres: true,
                    vidautil: true,
                },
                "9": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    valres: true,
                    vidautil: true,
                },
            },
            IdCodamo: {
                "0": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    Valres: true,
                    IdCodamo: true,
                    vidautil: true,
                },
                "9": {
                    IdActivo: true,
                    Descripcion: true,
                    IdTipo: true,
                    Valres: true,
                    IdCodamo: true,
                    vidautil: true,
                },
            }
        }

        return validations;
    }
}

export default Account;