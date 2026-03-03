import { usuariosModel, ConverFieldModel } from "@/generated/prisma/models";
import { getPrisma } from '@/lib/prisma/prisma';
import { Table, AllData, ReOrderData, Validation } from "./Table";
import { PrismaClient } from '@/generated/prisma/client';
import { parseStringDate, parseDateString } from '@/util/date/parseDate';
import { truncate } from "fs";

type SerializedUser = Omit<usuariosModel, "fechavto" | "vtosino" | "supervisor"> & { fechavto: string, vtosino: string, supervisor: string };

export type UserData = AllData<SerializedUser>;

class User extends Table<
    SerializedUser,
    ReOrderData
> {
    prisma : PrismaClient;

    constructor(client: string){
        super(client);
        this.prisma = getPrisma(this.client);
    }

    async getAll() : Promise<UserData> {
        const users : usuariosModel[] = await this.prisma.usuarios.findMany();
        const serializedUsers = users.map(item => ({
            ...item,
            vtosino: item.vtosino ? '1' : '0',
            supervisor: item.supervisor ? '1' : '0',
            fechavto: parseStringDate(item.fechavto),
        }));
        const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
            where: {
                IdTabla: 'usuarios',
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
            table: serializedUsers,
            fieldsManage: fieldsManage.map(field => {
                if(field.IdCampo === 'idUsuario'){
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
                if(field.IdCampo === 'vtosino'){
                    return {
                        ...field,
                        relation: [
                            { id: '0', description: 'No' },
                            { id: '1', description: 'Si' },
                        ],
                        options: {
                            required: true
                        }
                    };
                }
                if(field.IdCampo === 'Nombre'){
                    return {
                        ...field,
                        relation: [],
                        options: {
                            required: true
                        }
                    };
                }
                if(field.IdCampo === 'clave'){
                    return {
                        ...field,
                        relation: [],
                        options: {
                            required: true
                        }
                    };
                }
                if(field.IdCampo === 'supervisor'){
                    return {
                        ...field,
                        relation: [
                            { id: '0', description: 'No' },
                            { id: '1', description: 'Si' },
                        ],
                        options: {
                            required: true
                        }
                    };
                }
                if(field.IdCampo === 'fechavto'){
                    return {
                        ...field,
                        relation: [],
                        options: {
                            required: false,
                            isDate: true,
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

    async getOne(id: string) : Promise<SerializedUser | null> {
        const user = await this.prisma.usuarios.findUnique({
            where: {
                idUsuario: id
            }
        });
        return {
            ...user!,
            vtosino: user?.vtosino ? '1' : '0',
            supervisor: user?.supervisor ? '1' : '0',
            fechavto: parseStringDate(user?.fechavto ?? null),
        };
    }

    async insertOne(data: SerializedUser) : Promise<SerializedUser> {
        const createdUser = await this.prisma.usuarios.create({
            data:{
                ...data,
                fechavto: parseDateString(data.fechavto),
                vtosino: Number(data.vtosino) === 1 ? true : false,
                supervisor: Number(data.supervisor) === 1 ? true : false,
            }
        });
        return {
            ...createdUser,
            vtosino: createdUser.vtosino ? '1' : '0',
            supervisor: createdUser.supervisor ? '1' : '0',
            fechavto: parseStringDate(createdUser.fechavto),
        };
    }

    async updateOne(data: SerializedUser) : Promise<SerializedUser> {
        const updatedUser = await this.prisma.usuarios.update({
            where: {
                idUsuario: data.idUsuario
            },
            data: {
                nombre: data.nombre ?? null,
                clave: data.clave ?? null,
                supervisor: Number(data.supervisor) === 1 ? true : false,
                vtosino: Number(data.vtosino) === 1 ? true : false,
                fechavto: parseDateString(data.fechavto),
            }
        });

        return {
            ...updatedUser,
            vtosino: updatedUser.vtosino ? '1' : '0',
            supervisor: updatedUser.supervisor ? '1' : '0',
            fechavto: parseStringDate(updatedUser.fechavto),
        };
    }

    async deleteOne(id: string) : Promise<boolean> {
        try {
            await this.prisma.usuarios.delete({
                where: {
                    idUsuario: id,
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
    
    async getValidations() : Promise<Validation<usuariosModel>> {
        const validations = {
            vtosino: {
                "0": {
                    idUsuario: true,
                    nombre: true,
                    clave: true,
                    supervisor: true,
                    vtosino: true
                }
            }
        };

        return validations;
    }
}

export default User;