import { getPrisma } from "@/lib/prisma/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export type ReportType =
    | "ANEXO"
    | "DETALLE_ACTIVO"
    | "ALTAS_ACTIVO"
    | "BAJAS_ACTIVO"
    | "TRANSFERENCIAS_ACTIVO"
    | "ASIENTOS";

export type ReportBookOption = {
    key: string;
    value: string;
    tableName: string;
};

export type BookParamBounds = {
    /** Fecha mínima permitida (YYYY-MM-DD), desde `parametros.fecini` del libro. */
    fecini: string | null;
    /** Fecha máxima permitida (YYYY-MM-DD), desde `parametros.fecpro` del libro. */
    fecpro: string | null;
};

export type BookPeriodBoundsByBook = Record<string, Record<string, BookParamBounds>>;

export type ReportsConfig = {
    books: ReportBookOption[];
    defaultPeriod: string;
    periods: string[];
    /** Límites por `idmoextra` del libro (coincide con `book.key`). */
    paramBoundsByBook: Record<string, BookParamBounds>;
    /** Límites por período (YYYYMM) y libro, desde `cierres` (`fecini`/`fecpro`). */
    periodBoundsByBook: BookPeriodBoundsByBook;
};

function parametrosDateToYyyyMmDd(d: Date | null | undefined): string | null {
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/** Valor de celda de reporte → YYYY-MM-DD para comparar con el rango. */
function parseReportRowDateToYyyyMmDd(value: unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return value.toISOString().slice(0, 10);
    }
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) return s.slice(0, 10);
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) {
        const day = m[1].padStart(2, "0");
        const month = m[2].padStart(2, "0");
        const year = m[3];
        return `${year}-${month}-${day}`;
    }
    return null;
}

function findRowValueCaseInsensitive(row: Record<string, unknown>, fieldName: string): unknown {
    if (fieldName in row) return row[fieldName];
    const lower = fieldName.toLowerCase();
    const key = Object.keys(row).find((k) => k.toLowerCase() === lower);
    return key != null ? row[key] : undefined;
}

function getNestedRowValue(row: Record<string, unknown>, dottedPath: string): unknown {
    const parts = dottedPath.split(".");
    let cur: unknown = row;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
        const obj = cur as Record<string, unknown>;
        const key = Object.keys(obj).find((k) => k.toLowerCase() === p.toLowerCase());
        if (!key) return undefined;
        cur = obj[key];
    }
    return cur;
}

function getReportDateFieldValue(row: Record<string, unknown>, candidates: string[]): unknown {
    for (const c of candidates) {
        if (c.includes(".")) {
            const v = getNestedRowValue(row, c);
            if (v !== undefined && v !== null && v !== "") return v;
        } else {
            const v = findRowValueCaseInsensitive(row, c);
            if (v !== undefined && v !== null && v !== "") return v;
        }
    }
    return undefined;
}

const REPORT_DATE_FIELD_CANDIDATES: Record<"ALTAS_ACTIVO" | "BAJAS_ACTIVO" | "TRANSFERENCIAS_ACTIVO", string[]> = {
    ALTAS_ACTIVO: ["fecori"],
    BAJAS_ACTIVO: ["fecbaj", "febaja"],
    TRANSFERENCIAS_ACTIVO: ["trfecactivo", "cabecera.trfecactivo", "cabecera.trFecActivo"],
};

function filterReportRowsByDateRange(
    rows: Record<string, unknown>[],
    reportType: keyof typeof REPORT_DATE_FIELD_CANDIDATES,
    dateFrom: string,
    dateTo: string
): Record<string, unknown>[] {
    const candidates = REPORT_DATE_FIELD_CANDIDATES[reportType];
    return rows.filter((row) => {
        const raw = getReportDateFieldValue(row, candidates);
        const ymd = parseReportRowDateToYyyyMmDd(raw);
        if (!ymd) return false;
        return ymd >= dateFrom && ymd <= dateTo;
    });
}

class Reports {
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

    private isValidYYYYMM(value: string): boolean {
        if (!/^\d{6}$/.test(value)) return false;
        const month = Number(value.slice(4, 6));
        return month >= 1 && month <= 12;
    }

    private escapeSqlString(value: string): string {
        return value.replace(/'/g, "''");
    }

    private normalizeBookTableName(rawValue: string): string {
        const trimmed = rawValue.trim();
        if (trimmed === "ml") return "monedalocal";
        if (trimmed === "im") return "impuestos";
        return trimmed;
    }

    private normalizeBookKey(rawValue: string): string {
        return rawValue.trim();
    }

    private async getFecproFromParametrosYYYYMM(bookKey: string): Promise<string | null> {
        const escapedKey = this.escapeSqlString(bookKey.trim().toUpperCase());
        const rows = await this.prisma.$queryRawUnsafe<Array<{ period: string | null }>>(`
            SELECT TOP 1 LEFT(CONVERT(VARCHAR(8), fecpro, 112), 6) AS period
            FROM parametros
            WHERE fecpro IS NOT NULL
              AND UPPER(LTRIM(RTRIM(idmoextra))) = '${escapedKey}'
        `);
        const period = (rows[0]?.period ?? "").trim();
        return this.isValidYYYYMM(period) ? period : null;
    }

    private resolveBaseTableForBackup(rawTableName: string): "MONEDALOCAL" | "IMPUESTOS" | "ME01" | "ME02" | null {
        const normalized = rawTableName.trim().toUpperCase();
        if (normalized === "MONEDALOCAL") return "MONEDALOCAL";
        if (normalized === "IMPUESTOS") return "IMPUESTOS";
        if (normalized === "ME01") return "ME01";
        if (normalized === "ME02") return "ME02";
        return null;
    }

    private buildBackupTableName(baseTable: "MONEDALOCAL" | "IMPUESTOS" | "ME01" | "ME02", period: string): string {
        const month = period.slice(4, 6);
        switch (baseTable) {
            case "MONEDALOCAL":
                return `MOLO${month}`;
            case "IMPUESTOS":
                return `IMPU${month}`;
            case "ME01":
                return `ME01${month}`;
            case "ME02":
                return `ME02${month}`;
        }
    }

    private async resolveTableNameForPeriod(bookKey: string, tableName: string, period: string): Promise<string> {
        const baseTable = this.resolveBaseTableForBackup(tableName);
        if (!baseTable) return tableName;

        const fecpro = await this.getFecproFromParametrosYYYYMM(bookKey);
        if (!fecpro) return tableName;

        // YYYYMM can be safely compared lexicographically.
        if (period < fecpro) {
            return this.buildBackupTableName(baseTable, period);
        }
        return tableName;
    }

    private async executeDetWithFallback(
        book: string,
        bookTableName: string,
        period: string,
        tipoPeriodo: "T" | "A" | "B" | "F",
        strictTableOnly = false
    ): Promise<Record<string, unknown>[]> {
        const periodVariants = [
            period,
            `${period.slice(0, 4)}-${period.slice(4, 6)}-01`,
            `${period.slice(4, 6)}/${period.slice(0, 4)}`,
        ];

        const escapedBook = this.escapeSqlString(book);
        const escapedBookTableName = this.escapeSqlString(bookTableName);
        const attempts: { label: string; sql: string }[] = [];
        for (const periodVariant of periodVariants) {
            const escapedPeriodVariant = this.escapeSqlString(periodVariant);
            attempts.push({
                label: `bookTableName + ${periodVariant}`,
                sql: `EXEC dbo.PR_DET '${escapedBookTableName}', '${escapedPeriodVariant}', '${tipoPeriodo}'`,
            });

            if (!strictTableOnly) {
                attempts.push(
                    {
                        label: `book + ${periodVariant}`,
                        sql: `EXEC dbo.PR_DET '${escapedBook}', '${escapedPeriodVariant}', '${tipoPeriodo}'`,
                    },
                    {
                        label: `period/bookTableName + ${periodVariant}`,
                        sql: `EXEC dbo.PR_DET '${escapedPeriodVariant}', '${escapedBookTableName}', '${tipoPeriodo}'`,
                    },
                    {
                        label: `period/book + ${periodVariant}`,
                        sql: `EXEC dbo.PR_DET '${escapedPeriodVariant}', '${escapedBook}', '${tipoPeriodo}'`,
                    }
                );
            }
        }

        let firstSuccessfulEmpty: Record<string, unknown>[] | null = null;
        let lastError: Error | null = null;

        for (const attempt of attempts) {
            try {
                const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(attempt.sql);
                console.log(`[reports] PR_DET attempt (${attempt.label}) -> rows: ${rows.length}`);
                if (rows.length > 0) return rows;
                if (!firstSuccessfulEmpty) firstSuccessfulEmpty = rows;
            } catch (err) {
                console.log(`[reports] PR_DET attempt (${attempt.label}) -> error`);
                if (err instanceof Error) {
                    lastError = err;
                } else {
                    lastError = new Error(String(err));
                }
            }
        }

        if (firstSuccessfulEmpty) return firstSuccessfulEmpty;
        if (lastError) throw lastError;
        return [];
    }

    async getConfig(simulationOnly = false): Promise<ReportsConfig> {
        const [moextraRows, defaultFromParametros, cierresRows, parametrosRows] = await Promise.all([
            this.prisma.moextra.findMany({
                where: {
                    simula: simulationOnly ? true : false,
                },
                select: {
                    idMoextra: true,
                    Descripcion: true,
                    clave: true,
                },
                orderBy: { idMoextra: "asc" },
            }),
            this.getFecproFromParametrosYYYYMM(simulationOnly ? "03" : "ml"),
            simulationOnly
                ? this.prisma.$queryRawUnsafe<Array<{ period: string; idmoextra: string | null; fecini: Date | null; fecpro: Date | null }>>(`
                    SELECT DISTINCT
                        LEFT(CONVERT(VARCHAR(8), fecpro, 112), 6) AS period,
                        idmoextra,
                        fecini,
                        fecpro
                    FROM cierres
                    WHERE fecpro IS NOT NULL
                      AND LTRIM(RTRIM(idmoextra)) = '03'
                    ORDER BY period DESC
                `)
                : this.prisma.$queryRawUnsafe<Array<{ period: string; idmoextra: string | null; fecini: Date | null; fecpro: Date | null }>>(`
                    SELECT DISTINCT
                        LEFT(CONVERT(VARCHAR(8), fecpro, 112), 6) AS period,
                        idmoextra,
                        fecini,
                        fecpro
                    FROM cierres
                    WHERE fecpro IS NOT NULL
                    ORDER BY period DESC
                `),
            this.prisma.parametros.findMany({
                select: { idmoextra: true, fecini: true, fecpro: true },
            }),
        ]);

        const paramBoundsByBook: Record<string, BookParamBounds> = {};
        for (const p of parametrosRows) {
            const k = (p.idmoextra ?? "").trim();
            if (!k) continue;
            paramBoundsByBook[k] = {
                fecini: parametrosDateToYyyyMmDd(p.fecini),
                fecpro: parametrosDateToYyyyMmDd(p.fecpro),
            };
        }

        const periodBoundsByBook: BookPeriodBoundsByBook = {};
        for (const row of cierresRows) {
            const period = (row.period ?? "").trim();
            if (!this.isValidYYYYMM(period)) continue;
            const bookKey = (row.idmoextra ?? "").trim();
            if (!bookKey) continue;
            if (!periodBoundsByBook[bookKey]) periodBoundsByBook[bookKey] = {};
            periodBoundsByBook[bookKey][period] = {
                fecini: parametrosDateToYyyyMmDd(row.fecini),
                fecpro: parametrosDateToYyyyMmDd(row.fecpro),
            };
        }

        const booksMap = new Map<string, ReportBookOption>();

        if (!simulationOnly) {
            booksMap.set("ml", {
                key: "ml",
                value: "Moneda local",
                tableName: "monedalocal",
            });
            booksMap.set("im", {
                key: "im",
                value: "Impuestos",
                tableName: "impuestos",
            });
        }

        for (const row of moextraRows) {
            const id = (row.idMoextra ?? "").trim();
            if (!id) continue;
            const value = row.Descripcion?.trim() || id;
            const tableName = this.normalizeBookTableName((row.clave ?? "").trim() || id);
            if (!booksMap.has(id)) {
                booksMap.set(id, {
                    key: id,
                    value,
                    tableName,
                });
            }
        }

        const periods = Array.from(
            new Set(
                cierresRows
                    .map((row) => (row.period ?? "").trim())
                    .filter((value) => this.isValidYYYYMM(value))
            )
        );

        const defaultPeriod = defaultFromParametros ?? "";
        if (defaultPeriod && !periods.includes(defaultPeriod)) {
            periods.unshift(defaultPeriod);
        }

        return {
            books: Array.from(booksMap.values()),
            defaultPeriod,
            periods,
            paramBoundsByBook,
            periodBoundsByBook,
        };
    }

    private isValidYyyyMmDd(value: string): boolean {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const t = Date.parse(`${value}T12:00:00.000Z`);
        return !Number.isNaN(t);
    }

    private async getParamBoundsForBook(bookKey: string): Promise<BookParamBounds> {
        const id = bookKey.trim();
        const row = await this.prisma.parametros.findUnique({
            where: { idmoextra: id },
            select: { fecini: true, fecpro: true },
        });
        if (!row) return { fecini: null, fecpro: null };
        return {
            fecini: parametrosDateToYyyyMmDd(row.fecini),
            fecpro: parametrosDateToYyyyMmDd(row.fecpro),
        };
    }

    private async getCierreBoundsForBookPeriod(bookKey: string, period: string): Promise<BookParamBounds> {
        const escapedBookKey = this.escapeSqlString(bookKey.trim().toUpperCase());
        const escapedPeriod = this.escapeSqlString(period.trim());
        const rows = await this.prisma.$queryRawUnsafe<Array<{ fecini: Date | null; fecpro: Date | null }>>(`
            SELECT TOP 1 fecini, fecpro
            FROM cierres
            WHERE fecpro IS NOT NULL
              AND UPPER(LTRIM(RTRIM(idmoextra))) = '${escapedBookKey}'
              AND LEFT(CONVERT(VARCHAR(8), fecpro, 112), 6) = '${escapedPeriod}'
            ORDER BY fecpro DESC
        `);
        const row = rows[0];
        if (!row) return { fecini: null, fecpro: null };
        return {
            fecini: parametrosDateToYyyyMmDd(row.fecini),
            fecpro: parametrosDateToYyyyMmDd(row.fecpro),
        };
    }

    private async getDateBoundsForBookAndPeriod(bookKey: string, period: string): Promise<{ bounds: BookParamBounds; source: "parametros" | "cierres" }> {
        const paramBounds = await this.getParamBoundsForBook(bookKey);
        const paramFecproPeriod = paramBounds.fecpro ? paramBounds.fecpro.slice(0, 7).replace("-", "") : null;
        if (paramFecproPeriod && period === paramFecproPeriod) {
            return { bounds: paramBounds, source: "parametros" };
        }
        const cierreBounds = await this.getCierreBoundsForBookPeriod(bookKey, period);
        return { bounds: cierreBounds, source: "cierres" };
    }

    private normalizeConverFieldKey(idCampo: string): string {
        return idCampo
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[_\-.]/g, "");
    }

    private resolveAsientosModel(bookKey: string, bookTableName: string): {
        delegate: "asientosml" | "asientos01" | "asientos02";
        prefixLabel: string;
        idTabla: string;
    } {
        const key = bookKey.trim().toLowerCase();
        const table = bookTableName.trim().toUpperCase();

        if (key === "im" || table === "IMPUESTOS") {
            throw new Error("El reporte Asientos no está disponible para Impuestos.");
        }

        if (table === "MONEDALOCAL" || key === "ml") {
            return { delegate: "asientosml", prefixLabel: "Moneda local", idTabla: "asientosml" };
        }
        if (table === "ME01") {
            return { delegate: "asientos01", prefixLabel: "ME01", idTabla: "asientos01" };
        }
        if (table === "ME02") {
            return { delegate: "asientos02", prefixLabel: "ME02", idTabla: "asientos02" };
        }

        throw new Error("Libro no soportado para Asientos (use Moneda local, ME01 o ME02).");
    }

    /** BrowNombre por campo (clave normalizada como en la grilla) desde ConverField.IdTabla. */
    async getAsientosConverFieldLabels(bookKey: string, bookTableName: string): Promise<Record<string, string>> {
        const normalizedBook = this.normalizeBookKey(bookKey);
        const normalizedBookTableName = this.normalizeBookTableName(bookTableName || bookKey);
        const { idTabla } = this.resolveAsientosModel(normalizedBook, normalizedBookTableName);

        const rows = await this.prisma.converField.findMany({
            where: { IdTabla: idTabla },
            orderBy: { lisordencampos: "asc" },
            select: { IdCampo: true, BrowNombre: true },
        });

        const out: Record<string, string> = {};
        for (const r of rows) {
            const campo = (r.IdCampo ?? "").trim();
            if (!campo) continue;
            const nk = this.normalizeConverFieldKey(campo);
            out[nk] = (r.BrowNombre ?? "").trim() || campo;
        }
        return out;
    }

    async runAsientosReport(book: string, bookTableName: string): Promise<Record<string, unknown>[]> {
        const normalizedBook = this.normalizeBookKey(book);
        const normalizedBookTableName = this.normalizeBookTableName(bookTableName || book);
        const { delegate, prefixLabel } = this.resolveAsientosModel(normalizedBook, normalizedBookTableName);

        const orderBy = [{ idAsiento: "asc" as const }, { idcodigo: "asc" as const }];
        const rawRows =
            delegate === "asientosml"
                ? await this.prisma.asientosml.findMany({ orderBy })
                : delegate === "asientos01"
                  ? await this.prisma.asientos01.findMany({ orderBy })
                  : await this.prisma.asientos02.findMany({ orderBy });

        return rawRows.map((row: (typeof rawRows)[number]) => {
            const tipo = String(row.tipoimporte ?? "")
                .trim()
                .toUpperCase();
            const imp = typeof row.importe === "number" && Number.isFinite(row.importe) ? row.importe : 0;
            const debe = tipo === "D" ? imp : 0;
            const haber = tipo === "H" ? imp : 0;
            const idAsiento = row.idAsiento ?? "";
            const referencia = `${prefixLabel} - ${idAsiento}`;

            return {
                referencia,
                idAsiento: row.idAsiento,
                FechaProceso: row.FechaProceso,
                idMoneda: row.idMoneda,
                idGrupo: row.idGrupo,
                idEmpresa: row.idEmpresa,
                idUnegocio: row.idUnegocio,
                idActivo: row.idActivo,
                idCencos: row.idCencos,
                idProyecto: row.idProyecto,
                idZona: row.idZona,
                idPlanta: row.idPlanta,
                descripcion: row.descripcion,
                tipoimporte: row.tipoimporte,
                impdol: row.impdol,
                debe,
                haber,
            };
        });
    }

    async runReport(params: {
        reportType: ReportType;
        book: string;
        bookTableName: string;
        period: string;
        /** YYYY-MM-DD; obligatorio para Altas, Bajas y Transferencias (filtro sobre FECORI / FEBAJA / TRFECACTIVO). */
        dateFrom?: string;
        dateTo?: string;
    }): Promise<Record<string, unknown>[]> {
        const { reportType, book, bookTableName, period, dateFrom, dateTo } = params;
        const normalizedBook = this.normalizeBookKey(book);
        const normalizedBookTableName = this.normalizeBookTableName(bookTableName || book);
        if (!normalizedBook || !normalizedBookTableName) throw new Error("El libro es obligatorio");

        if (reportType === "ASIENTOS") {
            return this.runAsientosReport(normalizedBook, normalizedBookTableName);
        }

        if (!this.isValidYYYYMM(period)) throw new Error("El período debe tener formato YYYYMM");

        const needsDateRange =
            reportType === "ALTAS_ACTIVO" || reportType === "BAJAS_ACTIVO" || reportType === "TRANSFERENCIAS_ACTIVO";

        let dateRangeFilter: { from: string; to: string } | null = null;
        if (needsDateRange) {
            const from = (dateFrom ?? "").trim();
            const to = (dateTo ?? "").trim();
            if (!from || !to) {
                throw new Error("Indicá fecha desde y hasta para este reporte.");
            }
            if (!this.isValidYyyyMmDd(from) || !this.isValidYyyyMmDd(to)) {
                throw new Error("Las fechas deben tener formato AAAA-MM-DD.");
            }
            if (from > to) {
                throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");
            }

            const { bounds, source } = await this.getDateBoundsForBookAndPeriod(normalizedBook, period);
            if (!bounds.fecini || !bounds.fecpro) {
                throw new Error(
                    source === "parametros"
                        ? "No hay fecini y fecpro definidos en parámetros para este libro."
                        : "No hay fecini y fecpro definidos en cierres para ese período y libro."
                );
            }
            if (from < bounds.fecini || to > bounds.fecpro) {
                throw new Error(
                    source === "parametros"
                        ? `Las fechas deben estar entre ${bounds.fecini} y ${bounds.fecpro} (límites de parámetros del libro).`
                        : `Las fechas deben estar entre ${bounds.fecini} y ${bounds.fecpro} (límites de cierres para el período).`
                );
            }
            dateRangeFilter = { from, to };
        }

        const resolvedTableName = await this.resolveTableNameForPeriod(
            normalizedBook,
            normalizedBookTableName,
            period
        );

        const escapedBookTableName = this.escapeSqlString(resolvedTableName);
        const escapedPeriod = this.escapeSqlString(period);

        if (reportType === "ANEXO") {
            return this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `EXEC dbo.PR_ANE '${escapedBookTableName}', '${escapedPeriod}'`
            );
        }

        const tipoPeriodoByReport: Record<Exclude<ReportType, "ANEXO" | "ASIENTOS">, "T" | "A" | "B" | "F"> = {
            DETALLE_ACTIVO: "T",
            ALTAS_ACTIVO: "A",
            BAJAS_ACTIVO: "B",
            TRANSFERENCIAS_ACTIVO: "F",
        };

        const tipoPeriodo = tipoPeriodoByReport[reportType as Exclude<ReportType, "ANEXO" | "ASIENTOS">];
        const strictTableOnly = resolvedTableName !== normalizedBookTableName;
        let rows = await this.executeDetWithFallback(
            normalizedBook,
            resolvedTableName,
            period,
            tipoPeriodo,
            strictTableOnly
        );

        if (dateRangeFilter) {
            rows = filterReportRowsByDateRange(
                rows,
                reportType as keyof typeof REPORT_DATE_FIELD_CANDIDATES,
                dateRangeFilter.from,
                dateRangeFilter.to
            );
        }

        return rows;
    }
}

export default Reports;
