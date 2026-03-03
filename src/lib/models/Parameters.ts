import { getPrisma } from '@/lib/prisma/prisma';
import { PrismaClient } from '@/generated/prisma/client';
import { ParametrosModel } from '@/generated/prisma/models';

class Parameters {
    prisma : PrismaClient;
    idmoextra: string;

    constructor(client: string, ismoextra: string){
        this.prisma = getPrisma(client);
        this.idmoextra = ismoextra;
    }

    async getAll() : Promise<Omit<ParametrosModel, 'fecrev'>[]> {
        const parameters : Omit<ParametrosModel, 'fecrev'>[] = await this.prisma.parametros.findMany({
            where: {
                idmoextra: this.idmoextra
            },
            select: {
                idmoextra: true,
                fecini: true,
                fecpro: true,
                fecant: true,
                procesa: true,
                IdTipoAmortizacion: true,
                alterna: true
            }
        });

        return parameters;
    }

    async getAllExcept(excludeIdmoextra: string): Promise<Omit<ParametrosModel, 'fecrev'>[]> {
        const parameters = await this.prisma.parametros.findMany({
            where: {
                idmoextra: { not: excludeIdmoextra }
            },
            select: {
                idmoextra: true,
                fecini: true,
                fecpro: true,
                fecant: true,
                procesa: true,
                IdTipoAmortizacion: true,
                alterna: true
            }
        });
        return parameters;
    }

    async update(idmoextra: string, data: {
        fecini?: Date | null;
        fecpro?: Date | null;
        fecant?: Date | null;
        procesa?: boolean;
        IdTipoAmortizacion?: string | null;
        alterna?: boolean;
    }): Promise<ParametrosModel> {
        return this.prisma.parametros.update({
            where: { idmoextra },
            data
        });
    }

    async getTipAmorOptions(): Promise<{ IdInterno: string | null; Descripcion: string | null }[]> {
        return this.prisma.interna.findMany({
            where: { Tipo: "TIPAMOR" },
            select: { IdInterno: true, Descripcion: true }
        });
    }

    async getParametrosFields(): Promise<{ IdCampo: string; BrowNombre: string | null }[]> {
        return this.prisma.converField.findMany({
            where: { IdTabla: "Parametros" },
            orderBy: { lisordencampos: "asc" },
            select: { IdCampo: true, BrowNombre: true }
        });
    }

    async getMoextra(): Promise<{ idMoextra: string; Descripcion: string | null }[]> {
        return this.prisma.moextra.findMany({
            select: { idMoextra: true, Descripcion: true }
        });
    }
}

export default Parameters;