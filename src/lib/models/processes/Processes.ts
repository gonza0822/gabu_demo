import { getPrisma } from "@/lib/prisma/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export type ProcessTableRow = {
    idMoextra: string;
    nombretabla: string;
    clave: string;
    fecini: string | null;
    fecpro: string | null;
    fecant: string | null;
    procesa: boolean;
    alterna: boolean;
};

class Processes {
    prisma: PrismaClient;

    constructor(client: string) {
        this.prisma = getPrisma(client);
    }

    private dateToYYYYMM(date: Date | null | undefined): string | null {
        if (!date) return null;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}${m}`;
    }

    private dateToSQL(date: Date | null | undefined): string | null {
        if (!date) return null;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}-01`;
    }

    private escapeSqlString(value: string): string {
        return value.replace(/'/g, "''");
    }

    private yyyymmToDate(value: string | null): Date | null {
        if (!value || !/^\d{6}$/.test(value)) return null;
        return new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, 1);
    }

    private addMonths(date: Date, months: number): Date {
        return new Date(date.getFullYear(), date.getMonth() + months, 1);
    }

    private monthsDiff(a: Date, b: Date): number {
        return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
    }

    private resolveTableNameForSP(clave: string, fallbackName: string): string {
        if (clave === "ml") return "monedalocal";
        if (clave === "im") return "impuestos";
        return clave || fallbackName;
    }

    async getProcessRows(simulationOnly = false): Promise<ProcessTableRow[]> {
        const moextras = await this.prisma.moextra.findMany({
            where: simulationOnly ? { simula: true } : undefined,
            select: {
                idMoextra: true,
                Descripcion: true,
                clave: true,
            },
        });
        const allowedMoextraIds = new Set(moextras.map((m) => m.idMoextra));
        const parametros = await this.prisma.parametros.findMany({
            where: simulationOnly
                ? { idmoextra: { in: Array.from(allowedMoextraIds) } }
                : { idmoextra: { not: "03" } },
            select: {
                idmoextra: true,
                fecini: true,
                fecpro: true,
                fecant: true,
                procesa: true,
                alterna: true,
            },
            orderBy: { idmoextra: "asc" },
        });

        const moextraById = new Map(
            moextras.map((m) => [
                m.idMoextra,
                {
                    descripcion: m.Descripcion?.trim() ?? "",
                    clave: m.clave?.trim() ?? "",
                },
            ])
        );

        return parametros.map((p) => {
            const mo = moextraById.get(p.idmoextra);
            const clave = (mo?.clave || p.idmoextra || "").trim();
            const fallbackName =
                p.idmoextra === "ml" ? "monedalocal" : p.idmoextra === "im" ? "impuestos" : (mo?.descripcion || p.idmoextra);
            return {
                idMoextra: p.idmoextra,
                nombretabla: fallbackName,
                clave,
                fecini: this.dateToYYYYMM(p.fecini),
                fecpro: this.dateToYYYYMM(p.fecpro),
                fecant: this.dateToYYYYMM(p.fecant),
                procesa: Boolean(p.procesa),
                alterna: Boolean(p.alterna),
            };
        });
    }

    async runCalculoAmortizacion(row: ProcessTableRow): Promise<void> {
        const tabla = this.resolveTableNameForSP(row.clave, row.nombretabla);
        const fecini = this.dateToSQL(row.fecini ? new Date(`${row.fecini.slice(0, 4)}-${row.fecini.slice(4, 6)}-01`) : null);
        const fecpro = this.dateToSQL(row.fecpro ? new Date(`${row.fecpro.slice(0, 4)}-${row.fecpro.slice(4, 6)}-01`) : null);
        const fecant = this.dateToSQL(row.fecant ? new Date(`${row.fecant.slice(0, 4)}-${row.fecant.slice(4, 6)}-01`) : null);
        if (!tabla || !fecini || !fecpro || !fecant) {
            throw new Error("Faltan datos para ejecutar cálculo de amortización");
        }
        const usaOtro = row.alterna ? 1 : 0;
        await this.prisma.$executeRawUnsafe(
            `EXEC dbo.sp_calculoamortizacion @Tabla='${this.escapeSqlString(tabla)}', @Fecini='${fecini}', @Fecpro='${fecpro}', @Fecant='${fecant}', @Usaotro=${usaOtro}`
        );
    }

    async runGeneracionAsientos(row: ProcessTableRow): Promise<void> {
        const tabla = this.resolveTableNameForSP(row.clave, row.nombretabla);
        const fecini = this.dateToSQL(row.fecini ? new Date(`${row.fecini.slice(0, 4)}-${row.fecini.slice(4, 6)}-01`) : null);
        const fecpro = this.dateToSQL(row.fecpro ? new Date(`${row.fecpro.slice(0, 4)}-${row.fecpro.slice(4, 6)}-01`) : null);
        const fecant = this.dateToSQL(row.fecant ? new Date(`${row.fecant.slice(0, 4)}-${row.fecant.slice(4, 6)}-01`) : null);
        if (!tabla || !fecini || !fecpro || !fecant) {
            throw new Error("Faltan datos para ejecutar generacion de asientos");
        }
        await this.prisma.$executeRawUnsafe(
            `EXEC dbo.PR_ASIENTOS @TablaOrigen='${this.escapeSqlString(tabla)}', @FECPRO='${fecpro}', @FECINI='${fecini}', @FECANT='${fecant}'`
        );
    }

    async syncCabeceraFecproFromParametroMl(): Promise<void> {
        const parametroMl = await this.prisma.parametros.findUnique({
            where: { idmoextra: "ml" },
            select: { fecpro: true },
        });
        const fecproYYYYMM = this.dateToYYYYMM(parametroMl?.fecpro);
        if (!fecproYYYYMM) {
            throw new Error("No se encontró fecpro en parámetros para idmoextra 'ml'");
        }
        await this.prisma.cabecera.updateMany({
            data: { fecpro: fecproYYYYMM },
        });
    }

    async runCierreMensual(row: ProcessTableRow): Promise<void> {
        const fechaCierre = row.fecpro;
        const fecproDate = this.yyyymmToDate(row.fecpro);
        const feciniDate = this.yyyymmToDate(row.fecini);
        const fecantDate = this.yyyymmToDate(row.fecant);
        if (!fechaCierre || !fecproDate || !feciniDate || !fecantDate) {
            throw new Error("Faltan datos para ejecutar cierre mensual");
        }

        const month = fechaCierre.slice(4, 6);
        const targetTable = `cabe${month}`;
        if (!/^cabe\d{2}$/.test(targetTable)) {
            throw new Error("Tabla de cierre mensual inválida");
        }

        const nextFecpro = this.addMonths(fecproDate, 1);
        const nextFecant = this.addMonths(fecantDate, 1);
        const diffAfterMove = this.monthsDiff(nextFecpro, feciniDate);
        const nextFecini = diffAfterMove > 12 ? this.addMonths(feciniDate, 12) : feciniDate;

        const fecproYYYYMM = this.dateToYYYYMM(fecproDate)!;
        const nextFecproYYYYMM = this.dateToYYYYMM(nextFecpro)!;

        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
                DELETE FROM dbo.${targetTable}
                WHERE fecpro = '${this.escapeSqlString(fecproYYYYMM)}'
            `);

            await tx.$executeRawUnsafe(`
                INSERT INTO dbo.${targetTable} (
                    idCodigo,idSubien,idSubtra,idSufijo,idDescripcion,cantidad,descripcion,idUnegocio,idActivo,idZona,idPlanta,idCencos,idModelo,idOrdenCompra,idOrigen,idProveedor,idFabricante,idProyecto,idSituacion,idFactura,identificacion,plidPoliza,plFecini,plFecfin,plidNaturaleza,plidPrima,plarticulo,trFecActivo,tridActivo,trFecCencos,tridCencos,trFecProyecto,tridProyecto,trFecUNegocio,tridUNegocio,trFecEmpresa,tridEmpresa,marcaSeleccion,escencial,nuevo,fecpro
                )
                SELECT
                    c.idCodigo,c.idSubien,c.idSubtra,c.idSufijo,c.idDescripcion,c.cantidad,c.descripcion,c.idUnegocio,c.idActivo,c.idZona,c.idPlanta,c.idCencos,c.idModelo,c.idOrdenCompra,c.idOrigen,c.idProveedor,c.idFabricante,c.idProyecto,c.idSituacion,c.idFactura,c.identificacion,c.plidPoliza,c.plFecini,c.plFecfin,c.plidNaturaleza,c.plidPrima,c.plarticulo,c.trFecActivo,c.tridActivo,c.trFecCencos,c.tridCencos,c.trFecProyecto,c.tridProyecto,c.trFecUNegocio,c.tridUNegocio,c.trFecEmpresa,c.tridEmpresa,c.marcaSeleccion,c.escencial,c.nuevo,'${this.escapeSqlString(fecproYYYYMM)}'
                FROM dbo.cabecera c
            `);

            await tx.parametros.update({
                where: { idmoextra: row.idMoextra },
                data: {
                    fecant: nextFecant,
                    fecpro: nextFecpro,
                    fecini: nextFecini,
                },
            });

            await tx.cierres.upsert({
                where: {
                    idmoextra_fecie: {
                        idmoextra: row.idMoextra,
                        fecie: fecproYYYYMM,
                    },
                },
                create: {
                    idmoextra: row.idMoextra,
                    fecie: fecproYYYYMM,
                    fecpro: fecproDate,
                    fecini: feciniDate,
                    fecant: fecantDate,
                },
                update: {
                    fecpro: fecproDate,
                    fecini: feciniDate,
                    fecant: fecantDate,
                },
            });

            await tx.cabecera.updateMany({
                data: { fecpro: nextFecproYYYYMM },
            });
        }, { timeout: 300000 });
    }

    async runCierreEjercicio(row: ProcessTableRow): Promise<void> {
        const tabla = this.resolveTableNameForSP(row.clave, row.nombretabla);
        if (!tabla) {
            throw new Error("Faltan datos para ejecutar cierre de ejercicio");
        }
        await this.prisma.$executeRawUnsafe(
            `EXEC dbo.sp_CierreEjercicio @NombreTabla='${this.escapeSqlString(tabla)}'`
        );
    }
}

export default Processes;
