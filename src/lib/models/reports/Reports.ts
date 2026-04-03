import { getPrisma } from "@/lib/prisma/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export type ReportType = "ANEXO" | "DETALLE_ACTIVO" | "ALTAS_ACTIVO" | "BAJAS_ACTIVO" | "TRANSFERENCIAS_ACTIVO";

export type ReportBookOption = {
    key: string;
    value: string;
    tableName: string;
};

export type ReportsConfig = {
    books: ReportBookOption[];
    defaultPeriod: string;
    periods: string[];
};

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

    async getConfig(): Promise<ReportsConfig> {
        const [moextraRows, defaultFromParametros, cierresRows] = await Promise.all([
            this.prisma.moextra.findMany({
                where: {
                    simula: false,
                },
                select: {
                    idMoextra: true,
                    Descripcion: true,
                    clave: true,
                },
                orderBy: { idMoextra: "asc" },
            }),
            this.getFecproFromParametrosYYYYMM("ml"),
            this.prisma.$queryRawUnsafe<Array<{ period: string }>>(`
                SELECT DISTINCT LEFT(CONVERT(VARCHAR(8), fecpro, 112), 6) AS period
                FROM cierres
                WHERE fecpro IS NOT NULL
                ORDER BY period DESC
            `),
        ]);

        const booksMap = new Map<string, ReportBookOption>();

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

        const periods = cierresRows
            .map((row) => (row.period ?? "").trim())
            .filter((value) => this.isValidYYYYMM(value));

        const defaultPeriod = defaultFromParametros ?? "";
        if (defaultPeriod && !periods.includes(defaultPeriod)) {
            periods.unshift(defaultPeriod);
        }

        return {
            books: Array.from(booksMap.values()),
            defaultPeriod,
            periods,
        };
    }

    async runReport(params: {
        reportType: ReportType;
        book: string;
        bookTableName: string;
        period: string;
    }): Promise<Record<string, unknown>[]> {
        const { reportType, book, bookTableName, period } = params;
        const normalizedBook = this.normalizeBookKey(book);
        const normalizedBookTableName = this.normalizeBookTableName(bookTableName || book);
        if (!normalizedBook || !normalizedBookTableName) throw new Error("El libro es obligatorio");
        if (!this.isValidYYYYMM(period)) throw new Error("El período debe tener formato YYYYMM");

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

        const tipoPeriodoByReport: Record<Exclude<ReportType, "ANEXO">, "T" | "A" | "B" | "F"> = {
            DETALLE_ACTIVO: "T",
            ALTAS_ACTIVO: "A",
            BAJAS_ACTIVO: "B",
            TRANSFERENCIAS_ACTIVO: "F",
        };

        const tipoPeriodo = tipoPeriodoByReport[reportType as Exclude<ReportType, "ANEXO">];
        const strictTableOnly = resolvedTableName !== normalizedBookTableName;
        return this.executeDetWithFallback(
            normalizedBook,
            resolvedTableName,
            period,
            tipoPeriodo,
            strictTableOnly
        );
    }
}

export default Reports;
