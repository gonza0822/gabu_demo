import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma/prisma";
import { labelFromMoextra, type MoextraLabelRow } from "@/lib/moextra/bookLabels";

const TIPO_CPTE = "COAF";
const USUARIO_SAF = "SAF";

const CIA_BY_PREFIX: Record<string, string> = {
    "1": "110",
    "2": "109",
    "3": "510",
    "4": "107",
};

export type InterfaceBookRow = {
    idMoextra: string;
    label: string;
    asientosTable: "asientosml" | "asientos01" | "asientos02";
    fecpro: string;
    asientos: number;
    lineas: number;
    debe: number;
    haber: number;
    diferencia: number;
    alreadySent: boolean;
};

type AsientoLine = {
    idAsiento: string;
    idActivo: string;
    tipoimporte: string;
    importe: number;
};

type BookDef = {
    idMoextra: string;
    asientosTable: InterfaceBookRow["asientosTable"];
    isDollar: boolean;
    interfaceDescrip: string;
};

const BOOKS: BookDef[] = [
    {
        idMoextra: "ml",
        asientosTable: "asientosml",
        isDollar: false,
        interfaceDescrip: "Interface S.A.F.(A)",
    },
    {
        idMoextra: "01",
        asientosTable: "asientos01",
        isDollar: true,
        interfaceDescrip: "Interface S.A.F(HB2)",
    },
    {
        idMoextra: "02",
        asientosTable: "asientos02",
        isDollar: false,
        interfaceDescrip: "Interface S.A.F.(H)",
    },
];

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function lastDayOfMonth(yyyymm: string): Date {
    const y = Number(yyyymm.slice(0, 4));
    const m = Number(yyyymm.slice(4, 6));
    return new Date(Date.UTC(y, m, 0));
}

function sqlDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function localDateOnly(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseIdActivo(idActivo: string | null | undefined): { prefix: string; cuenta: string; cia: string } | null {
    const raw = (idActivo ?? "").trim();
    if (raw.length < 3) return null;
    const prefix = raw.charAt(0);
    const cia = CIA_BY_PREFIX[prefix];
    if (!cia) return null;
    const cuenta = raw.slice(2, 15).trim().slice(0, 12);
    if (!cuenta) return null;
    return { prefix, cuenta, cia };
}

function auxForCuenta(cuenta: string, prefix: string): number {
    if (!cuenta.startsWith("500")) return 0;
    return prefix === "3" ? 2008 : 6002;
}

function dateToYYYYMM(date: Date | null | undefined): string | null {
    if (!date) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${y}${m}`;
}

class InterfaceAsientos {
    prisma: PrismaClient;

    constructor(client: string) {
        this.prisma = getPrisma(client);
    }

    private bookLabel(rows: MoextraLabelRow[], idMoextra: string): string {
        return labelFromMoextra(rows, idMoextra);
    }

    async getRows(): Promise<InterfaceBookRow[]> {
        const [parametros, moextraRows] = await Promise.all([
            this.prisma.parametros.findMany({
                where: { idmoextra: { in: BOOKS.map((b) => b.idMoextra) } },
                select: { idmoextra: true, fecpro: true },
            }),
            this.prisma.moextra.findMany({
                select: { idMoextra: true, Descripcion: true, clave: true },
            }),
        ]);
        const fecproById = new Map(parametros.map((p) => [p.idmoextra.trim(), dateToYYYYMM(p.fecpro)]));

        const rows: InterfaceBookRow[] = [];
        for (const book of BOOKS) {
            const fecpro = fecproById.get(book.idMoextra) ?? "";
            const summary = fecpro
                ? await this.summarizeBook(book, fecpro)
                : { asientos: 0, lineas: 0, debe: 0, haber: 0 };
            const alreadySent = fecpro ? await this.isAlreadySent(book, fecpro) : false;
            rows.push({
                idMoextra: book.idMoextra,
                label: this.bookLabel(moextraRows, book.idMoextra),
                asientosTable: book.asientosTable,
                fecpro,
                asientos: summary.asientos,
                lineas: summary.lineas,
                debe: summary.debe,
                haber: summary.haber,
                diferencia: round2(summary.debe - summary.haber),
                alreadySent,
            });
        }
        return rows;
    }

    async sendBooks(idMoextras: string[]): Promise<{ ok: true; sent: string[] }> {
        const wanted = new Set(idMoextras.map((id) => id.trim()));
        const selected = BOOKS.filter((b) => wanted.has(b.idMoextra));
        if (selected.length === 0) {
            throw new Error("Seleccione al menos un libro para enviar a contable.");
        }

        const sent: string[] = [];
        for (const book of selected) {
            await this.sendBook(book);
            sent.push(book.idMoextra);
        }
        return { ok: true, sent };
    }

    private async sendBook(book: BookDef): Promise<void> {
        const param = await this.prisma.parametros.findUnique({
            where: { idmoextra: book.idMoextra },
            select: { fecpro: true },
        });
        const fecpro = dateToYYYYMM(param?.fecpro);
        const bookLabel = labelFromMoextra(
            await this.prisma.moextra.findMany({ select: { idMoextra: true, Descripcion: true, clave: true } }),
            book.idMoextra
        );
        if (!fecpro) {
            throw new Error(`No hay fecha de proceso en parametros para ${bookLabel}.`);
        }

        const lines = await this.loadLines(book, fecpro);
        if (lines.length === 0) {
            throw new Error(`No hay asientos para interfacear en ${bookLabel} (${fecpro.slice(4, 6)}/${fecpro.slice(0, 4)}).`);
        }

        const tipos = await this.prisma.tblasientos.findMany({
            select: { idasiento: true, descripcion: true },
        });
        const descById = new Map(
            tipos.map((t) => [t.idasiento.trim(), (t.descripcion ?? "").trim() || t.idasiento.trim()])
        );

        const groups = new Map<string, AsientoLine[]>();
        for (const line of lines) {
            const parsed = parseIdActivo(line.idActivo);
            if (!parsed) continue;
            const key = `${line.idAsiento}::${parsed.cia}`;
            const bucket = groups.get(key);
            if (bucket) bucket.push(line);
            else groups.set(key, [line]);
        }
        if (groups.size === 0) {
            throw new Error(`Ninguna linea de ${bookLabel} tiene cuenta/sociedad valida para el contable.`);
        }

        const feccpte = lastDayOfMonth(fecpro);
        const anio = Number(fecpro.slice(0, 4));
        const mes = Number(fecpro.slice(4, 6));

        await this.prisma.$transaction(async (tx) => {
            for (const [key, groupLines] of groups) {
                const cia = key.split("::")[1];
                const idAsiento = groupLines[0].idAsiento;
                const reng1 = (descById.get(idAsiento) ?? idAsiento).slice(0, 200);
                const numero = await this.nextCoafNumero(tx, anio, mes);
                await this.insertCabecera(tx, cia, numero, reng1, feccpte);
                for (const line of groupLines) {
                    const parsed = parseIdActivo(line.idActivo);
                    if (!parsed) continue;
                    await this.insertDetalle(tx, {
                        cia,
                        numero,
                        feccpte,
                        cuenta: parsed.cuenta,
                        dh: line.tipoimporte === "H" ? "H" : "D",
                        aux: auxForCuenta(parsed.cuenta, parsed.prefix),
                        descrip: book.interfaceDescrip,
                        importe: line.importe,
                        isDollar: book.isDollar,
                    });
                }
            }
        }, { timeout: 300000 });
    }

    private async summarizeBook(book: BookDef, fecpro: string): Promise<{
        asientos: number;
        lineas: number;
        debe: number;
        haber: number;
    }> {
        const lines = await this.loadLines(book, fecpro);
        let debe = 0;
        let haber = 0;
        const ids = new Set<string>();
        for (const line of lines) {
            ids.add(line.idAsiento);
            if (line.tipoimporte === "H") haber += line.importe;
            else debe += line.importe;
        }
        return {
            asientos: ids.size,
            lineas: lines.length,
            debe: round2(debe),
            haber: round2(haber),
        };
    }

    private async loadLines(book: BookDef, fecpro: string): Promise<AsientoLine[]> {
        const allowed = new Set(["asientosml", "asientos01", "asientos02"]);
        if (!allowed.has(book.asientosTable)) {
            throw new Error("Tabla de asientos invalida");
        }
        const yyyy = fecpro.slice(0, 4);
        const mm = fecpro.slice(4, 6);
        const like = `${yyyy}-${mm}%`;
        const rows = await this.prisma.$queryRaw<Array<{
            idAsiento: string | null;
            idActivo: string | null;
            tipoimporte: string | null;
            importe: number | null;
        }>>(Prisma.sql`
            SELECT idAsiento, idActivo, tipoimporte, importe
            FROM ${Prisma.raw(`dbo.${book.asientosTable}`)}
            WHERE FechaProceso LIKE ${like}
              AND importe IS NOT NULL
        `);

        const lines: AsientoLine[] = [];
        for (const row of rows) {
            const importe = round2(Number(row.importe ?? 0));
            if (!Number.isFinite(importe) || Math.abs(importe) < 0.005) continue;
            const parsed = parseIdActivo(row.idActivo);
            if (!parsed) continue;
            lines.push({
                idAsiento: (row.idAsiento ?? "").trim(),
                idActivo: (row.idActivo ?? "").trim(),
                tipoimporte: (row.tipoimporte ?? "D").trim().toUpperCase(),
                importe,
            });
        }
        return lines;
    }

    private async isAlreadySent(book: BookDef, fecpro: string): Promise<boolean> {
        const feccpte = sqlDateOnly(lastDayOfMonth(fecpro));
        const rows = await this.prisma.$queryRaw<Array<{ n: number }>>(Prisma.sql`
            SELECT COUNT(*) AS n
            FROM [Database].dbo.cgt040b
            WHERE LTRIM(RTRIM(tipocpte)) = ${TIPO_CPTE}
              AND feccpte = ${feccpte}
              AND LTRIM(RTRIM(descrip)) = ${book.interfaceDescrip}
        `);
        return Number(rows[0]?.n ?? 0) > 0;
    }

    private async nextCoafNumero(
        tx: { $queryRaw: PrismaClient["$queryRaw"]; $executeRaw: PrismaClient["$executeRaw"] },
        anio: number,
        mes: number
    ): Promise<number> {
        const current = await tx.$queryRaw<Array<{ numero: number | null }>>(Prisma.sql`
            SELECT numero
            FROM [Database].dbo.cgt014a WITH (UPDLOCK, HOLDLOCK, ROWLOCK)
            WHERE LTRIM(RTRIM(cia)) = '000'
              AND LTRIM(RTRIM(tipocpte)) = ${TIPO_CPTE}
              AND anio = ${anio}
              AND mes = ${mes}
        `);
        if (current[0]?.numero != null) {
            const next = Number(current[0].numero) + 1;
            await tx.$executeRaw(Prisma.sql`
                UPDATE [Database].dbo.cgt014a
                SET numero = ${next}
                WHERE LTRIM(RTRIM(cia)) = '000'
                  AND LTRIM(RTRIM(tipocpte)) = ${TIPO_CPTE}
                  AND anio = ${anio}
                  AND mes = ${mes}
            `);
            return next;
        }
        const first = mes * 10000 + 1;
        await tx.$executeRaw(Prisma.sql`
            INSERT INTO [Database].dbo.cgt014a (cia, tipocpte, anio, mes, numero)
            VALUES ('000', ${TIPO_CPTE}, ${anio}, ${mes}, ${first})
        `);
        return first;
    }

    private async insertCabecera(
        tx: { $executeRaw: PrismaClient["$executeRaw"] },
        cia: string,
        numero: number,
        reng1: string,
        feccpte: Date
    ): Promise<void> {
        const now = new Date();
        const hora = now.toTimeString().slice(0, 8);
        const fecdia = localDateOnly(now);
        await tx.$executeRaw(Prisma.sql`
            INSERT INTO [Database].dbo.cgt040a
                (cia, tipocpte, numero, feccpte, reng1, usuario, fecdia, hora, erro, act, cia1, sucursal, nnn)
            VALUES
                (${cia}, ${TIPO_CPTE}, ${numero}, ${sqlDateOnly(feccpte)}, ${reng1}, ${USUARIO_SAF},
                 ${fecdia}, ${hora}, '', '', '000', '', 0)
        `);
    }

    private async insertDetalle(
        tx: { $executeRaw: PrismaClient["$executeRaw"] },
        args: {
            cia: string;
            numero: number;
            feccpte: Date;
            cuenta: string;
            dh: "D" | "H";
            aux: number;
            descrip: string;
            importe: number;
            isDollar: boolean;
        }
    ): Promise<void> {
        let impoml = args.isDollar ? 0 : args.importe;
        let impom1 = args.isDollar ? 0 : args.importe;
        let impom2 = args.isDollar ? args.importe : 0;
        const fec = sqlDateOnly(args.feccpte);

        if (impoml === 0 || impom1 === 0 || impom2 === 0) {
            const contra: "D" | "H" = args.dh === "D" ? "H" : "D";
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO [Database].dbo.cgt040b
                    (cia, tipocpte, feccpte, numero, cuenta, aux, descrip, partida, centro, impoml, dh, unidades, impom1, impom2, leyerr, act, cia1, sucursal, contrato, cheque, codvap)
                VALUES
                    (${args.cia}, ${TIPO_CPTE}, ${fec}, ${args.numero}, ${args.cuenta}, ${args.aux}, ${args.descrip},
                     '', '', 0.01, ${contra}, 0, 0.01, 0.01, '', '', '000', '', 0, 0, 0)
            `);
            impoml = round2(impoml + 0.01);
            impom1 = round2(impom1 + 0.01);
            impom2 = round2(impom2 + 0.01);
        }

        await tx.$executeRaw(Prisma.sql`
            INSERT INTO [Database].dbo.cgt040b
                (cia, tipocpte, feccpte, numero, cuenta, aux, descrip, partida, centro, impoml, dh, unidades, impom1, impom2, leyerr, act, cia1, sucursal, contrato, cheque, codvap)
            VALUES
                (${args.cia}, ${TIPO_CPTE}, ${fec}, ${args.numero}, ${args.cuenta}, ${args.aux}, ${args.descrip},
                 '', '', ${impoml}, ${args.dh}, 0, ${impom1}, ${impom2}, '', '', '000', '', 0, 0, 0)
        `);
    }
}

export default InterfaceAsientos;
