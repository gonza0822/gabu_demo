import { getPrisma } from "@/lib/prisma/prisma";
import { PrismaClient } from "@/generated/prisma/client";

export type DefaultRow = { idcampo: string; iddefault: string | null };

export type OptionItem = { key: string; value: string };

class Defaults {
    prisma: PrismaClient;

    constructor(client: string) {
        this.prisma = getPrisma(client);
    }

    async getAll(): Promise<DefaultRow[]> {
        return this.prisma.defaults.findMany({
            select: { idcampo: true, iddefault: true },
        });
    }

    async getOptions(idcampo: string): Promise<OptionItem[]> {
        const campo = idcampo.trim();
        if (!campo) return [];
        const campoLower = campo.toLowerCase();

        switch (campoLower) {
            case "idactivo": {
                const rows = await this.prisma.cuentas.findMany({
                    where: { IdActivo: { not: "0" } },
                    select: { IdActivo: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdActivo,
                    value: (r.Descripcion ?? r.IdActivo) ?? "",
                }));
            }
            case "idcencos": {
                const rows = await this.prisma.cCostos.findMany({
                    select: { IdCencos: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdCencos,
                    value: (r.Descripcion ?? r.IdCencos) ?? "",
                }));
            }
            case "idmodelo":
                return [];
            case "idorigen": {
                const rows = await this.prisma.origenes.findMany({
                    select: { IdOrigen: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdOrigen,
                    value: (r.Descripcion ?? r.IdOrigen) ?? "",
                }));
            }
            case "idplanta": {
                const rows = await this.prisma.plantas.findMany({
                    select: { IdPlanta: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdPlanta,
                    value: (r.Descripcion ?? r.IdPlanta) ?? "",
                }));
            }
            case "idproyecto": {
                const rows = await this.prisma.proyectos.findMany({
                    select: { IdProyecto: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdProyecto,
                    value: (r.Descripcion ?? r.IdProyecto) ?? "",
                }));
            }
            case "idunegocio": {
                const rows = await this.prisma.uNegocio.findMany({
                    select: { IdUNegocio: true, Descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.IdUNegocio,
                    value: (r.Descripcion ?? r.IdUNegocio) ?? "",
                }));
            }
            case "idzona": {
                const rows = await this.prisma.zonas.findMany({
                    select: { idZona: true, descripcion: true },
                });
                return rows.map((r) => ({
                    key: r.idZona,
                    value: (r.descripcion ?? r.idZona) ?? "",
                }));
            }
            default:
                return [];
        }
    }

    async update(idcampo: string, iddefault: string | null): Promise<DefaultRow> {
        return this.prisma.defaults.update({
            where: { idcampo },
            data: { iddefault },
            select: { idcampo: true, iddefault: true },
        });
    }

    async getDefaultsFields(): Promise<{ IdCampo: string; BrowNombre: string | null }[]> {
        const defaultHeaders = await this.prisma.converField.findMany({
            where: { IdTabla: "defaults" },
            orderBy: { lisordencampos: "asc" },
            select: { IdCampo: true, BrowNombre: true },
        });

        const campoTableMap: Array<{ idCampo: string; idTabla: string }> = [
            { idCampo: "idActivo", idTabla: "Cuentas" },
            { idCampo: "idCencos", idTabla: "CCostos" },
            { idCampo: "idModelo", idTabla: "Produccion" },
            { idCampo: "idOrigen", idTabla: "Origenes" },
            { idCampo: "idPlanta", idTabla: "Plantas" },
            { idCampo: "idProyecto", idTabla: "Proyectos" },
            { idCampo: "idUnegocio", idTabla: "UNegocio" },
            { idCampo: "idZona", idTabla: "Zonas" },
        ];

        const campoRows = await Promise.all(
            campoTableMap.map(async ({ idCampo, idTabla }) => {
                const row = await this.prisma.converField.findFirst({
                    where: { IdCampo: idCampo, IdTabla: idTabla },
                    select: { IdCampo: true, BrowNombre: true },
                });
                return {
                    IdCampo: idCampo,
                    BrowNombre: row?.BrowNombre ?? idCampo,
                };
            })
        );

        return [...defaultHeaders, ...campoRows];
    }
}

export default Defaults;
