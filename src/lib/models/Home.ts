import { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma/prisma";

type AggregateRow = {
    totalBienes: unknown;
    altasEjercicio: unknown;
    bajasEjercicio: unknown;
    veproeactual_tippro: unknown;
    veproeactual_altas: unknown;
    veproeactual_bajas: unknown;
    amafieactual_tippro: unknown;
    amafieactual_altas: unknown;
    amafieactual_bajas: unknown;
    amefieactual_tippro: unknown;
    amefieactual_altas: unknown;
    amefieactual_bajas: unknown;
    ampefeactual_tippro: unknown;
    ampefeactual_altas: unknown;
    ampefeactual_bajas: unknown;
};

export type HomeStats = {
    totalBienes: number;
    altasEjercicio: number;
    bajasEjercicio: number;
};

export type HomeBarChartData = {
    title: string;
    labels: string[];
    data: number[];
    /** Comparación de magnitudes muy distintas (p. ej. valor vs amort. período) */
    yScale?: "linear" | "log";
};

export type HomeTabData = {
    id: "monedaLocal" | "dolaresHB2" | "pesosHistoricos";
    title: string;
    charts: HomeBarChartData[];
};

export type HomeDashboardData = {
    stats: HomeStats;
    fechaProceso: string;
    tabs: HomeTabData[];
};

function isDecimalLikeObject(value: unknown): value is { s: number; e: number; d: number[] } {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
    return typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d);
}

function decimalLikeToNumber(value: { s: number; e: number; d: number[] }): number {
    if (value.d.length === 0) return 0;
    const coefficient = `${value.d[0]}${value.d.slice(1).map((chunk) => String(chunk).padStart(7, "0")).join("")}`;
    const exponent = value.e;
    let text: string;

    if (exponent < 0) {
        text = `0.${"0".repeat(Math.abs(exponent + 1))}${coefficient}`;
    } else if (exponent + 1 >= coefficient.length) {
        text = `${coefficient}${"0".repeat(exponent + 1 - coefficient.length)}`;
    } else {
        text = `${coefficient.slice(0, exponent + 1)}.${coefficient.slice(exponent + 1)}`;
    }

    const parsed = Number(value.s < 0 ? `-${text}` : text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown): number {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (isDecimalLikeObject(value)) return decimalLikeToNumber(value);
    return 0;
}

/** Evita 3 consultas a INFORMATION_SCHEMA por request (metadatos cambian raramente). */
const columnNamesCache = new Map<string, Set<string>>();
const HOME_DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const homeDashboardCache = new Map<
    string,
    { data: HomeDashboardData; expiresAt: number }
>();
const homeDashboardInflight = new Map<string, Promise<HomeDashboardData>>();

class Home {
    prisma: PrismaClient;

    constructor(client: string) {
        this.prisma = getPrisma(client);
    }

    private formatDateToMMYYYY(date: Date | null | undefined): string {
        if (!date) return "-";
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = date.getUTCFullYear();
        return `${month}/${year}`;
    }

    /** Una sola ida a `parametros` en lugar de dos consultas secuenciales. */
    private async getParametrosHome(): Promise<{ fecini: Date; fechaProceso: string }> {
        const rows = await this.prisma.$queryRawUnsafe<Array<{ fecini: Date | null; fecpro: Date | null }>>(
            `SELECT TOP 1 fecini, fecpro
             FROM parametros
             WHERE idmoextra IN ('ml', '01') AND fecini IS NOT NULL
             ORDER BY CASE WHEN idmoextra = 'ml' THEN 0 WHEN idmoextra = '01' THEN 1 ELSE 2 END`
        );
        const row = rows[0];
        return {
            fecini: row?.fecini ?? new Date("1900-01-01T00:00:00.000Z"),
            fechaProceso: this.formatDateToMMYYYY(row?.fecpro),
        };
    }

    private async getTableAggregates(tableName: "MONEDALOCAL" | "ME01" | "ME02", fecini: Date): Promise<AggregateRow> {
        let columns = columnNamesCache.get(tableName);
        if (!columns) {
            const columnsRows = await this.prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
                `SELECT COLUMN_NAME
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${tableName}'`
            );
            columns = new Set(columnsRows.map((r) => r.COLUMN_NAME.toLowerCase()));
            columnNamesCache.set(tableName, columns);
        }

        const has = (column: string) => columns.has(column.toLowerCase());
        const pickColumn = (candidates: string[]): string | null => {
            for (const candidate of candidates) {
                if (has(candidate)) return candidate;
            }
            return null;
        };

        const tipproCol = pickColumn(["tippro", "idtipoproceso"]);
        const fecoriCol = pickColumn(["fecori"]);
        const fecbajCol = pickColumn(["fecbaj"]);
        const veproCol = pickColumn(["veproeactual", "vrepoeactual"]);
        const amafieCol = pickColumn(["amafieactual"]);
        const amefieCol = pickColumn(["amefieactual"]);
        const ampefeCol = pickColumn(["ampefeactual"]);

        const tipproCond = tipproCol ? `LOWER(COALESCE(${tipproCol}, '')) = 's'` : "1 = 0";
        const fecoriCond = fecoriCol ? `${fecoriCol} >= '${fecini.toISOString()}'` : "1 = 0";
        const fecbajCond = fecbajCol ? `${fecbajCol} >= '${fecini.toISOString()}'` : "1 = 0";
        const amount = (column: string | null) => (column ? `COALESCE(${column}, 0)` : "0");

        const rows = await this.prisma.$queryRawUnsafe<AggregateRow[]>(
            `SELECT
                COUNT(1) AS totalBienes,
                SUM(CASE WHEN ${fecoriCond} THEN 1 ELSE 0 END) AS altasEjercicio,
                SUM(CASE WHEN ${fecbajCond} THEN 1 ELSE 0 END) AS bajasEjercicio,
                SUM(CASE WHEN ${tipproCond} THEN ${amount(veproCol)} ELSE 0 END) AS veproeactual_tippro,
                SUM(CASE WHEN ${fecoriCond} THEN ${amount(veproCol)} ELSE 0 END) AS veproeactual_altas,
                SUM(CASE WHEN ${fecbajCond} THEN ${amount(veproCol)} ELSE 0 END) AS veproeactual_bajas,
                SUM(CASE WHEN ${tipproCond} THEN ${amount(amafieCol)} ELSE 0 END) AS amafieactual_tippro,
                SUM(CASE WHEN ${fecoriCond} THEN ${amount(amafieCol)} ELSE 0 END) AS amafieactual_altas,
                SUM(CASE WHEN ${fecbajCond} THEN ${amount(amafieCol)} ELSE 0 END) AS amafieactual_bajas,
                SUM(CASE WHEN ${tipproCond} THEN ${amount(amefieCol)} ELSE 0 END) AS amefieactual_tippro,
                SUM(CASE WHEN ${fecoriCond} THEN ${amount(amefieCol)} ELSE 0 END) AS amefieactual_altas,
                SUM(CASE WHEN ${fecbajCond} THEN ${amount(amefieCol)} ELSE 0 END) AS amefieactual_bajas,
                SUM(CASE WHEN ${tipproCond} THEN ${amount(ampefeCol)} ELSE 0 END) AS ampefeactual_tippro,
                SUM(CASE WHEN ${fecoriCond} THEN ${amount(ampefeCol)} ELSE 0 END) AS ampefeactual_altas,
                SUM(CASE WHEN ${fecbajCond} THEN ${amount(ampefeCol)} ELSE 0 END) AS ampefeactual_bajas
             FROM [dbo].[${tableName}]`
        );

        return (
            rows[0] ?? {
                totalBienes: 0,
                altasEjercicio: 0,
                bajasEjercicio: 0,
                veproeactual_tippro: 0,
                veproeactual_altas: 0,
                veproeactual_bajas: 0,
                amafieactual_tippro: 0,
                amafieactual_altas: 0,
                amafieactual_bajas: 0,
                amefieactual_tippro: 0,
                amefieactual_altas: 0,
                amefieactual_bajas: 0,
                ampefeactual_tippro: 0,
                ampefeactual_altas: 0,
                ampefeactual_bajas: 0,
            }
        );
    }

    private mapTableToTab(
        row: AggregateRow,
        id: HomeTabData["id"],
        title: string
    ): HomeTabData {
        return {
            id,
            title,
            charts: [
                {
                    title: "Comparación totales",
                    labels: ["Valores", "Am. acum. inicio", "Am. ejercicio", "Am. período", "Neto resultante"],
                    data: [
                        toNumber(row.veproeactual_tippro),
                        toNumber(row.amafieactual_tippro),
                        toNumber(row.amefieactual_tippro),
                        toNumber(row.ampefeactual_tippro),
                        toNumber(row.veproeactual_tippro) - toNumber(row.amafieactual_tippro) - toNumber(row.amefieactual_tippro),
                    ],
                    yScale: "log",
                },
                {
                    title: "Valores",
                    labels: ["Todos", "Altas ejercicio", "Bajas ejercicio"],
                    data: [toNumber(row.veproeactual_tippro), toNumber(row.veproeactual_altas), toNumber(row.veproeactual_bajas)],
                },
                {
                    title: "Amort acum al inicio",
                    labels: ["Todos", "Altas ejercicio", "Bajas ejercicio"],
                    data: [toNumber(row.amafieactual_tippro), toNumber(row.amafieactual_altas), toNumber(row.amafieactual_bajas)],
                },
                {
                    title: "Amort ejercicio",
                    labels: ["Todos", "Altas ejercicio", "Bajas ejercicio"],
                    data: [toNumber(row.amefieactual_tippro), toNumber(row.amefieactual_altas), toNumber(row.amefieactual_bajas)],
                },
                {
                    title: "Amort período",
                    labels: ["Todos", "Altas ejercicio", "Bajas ejercicio"],
                    data: [toNumber(row.ampefeactual_tippro), toNumber(row.ampefeactual_altas), toNumber(row.ampefeactual_bajas)],
                },
            ],
        };
    }

    async getDashboard(): Promise<HomeDashboardData> {
        const { fecini, fechaProceso } = await this.getParametrosHome();
        const [monedaLocal, me01, me02] = await Promise.all([
            this.getTableAggregates("MONEDALOCAL", fecini),
            this.getTableAggregates("ME01", fecini),
            this.getTableAggregates("ME02", fecini),
        ]);

        return {
            stats: {
                totalBienes: toNumber(monedaLocal.totalBienes),
                altasEjercicio: toNumber(monedaLocal.altasEjercicio),
                bajasEjercicio: toNumber(monedaLocal.bajasEjercicio),
            },
            fechaProceso,
            tabs: [
                this.mapTableToTab(monedaLocal, "monedaLocal", "Moneda local"),
                this.mapTableToTab(me01, "dolaresHB2", "Dolares HB2"),
                this.mapTableToTab(me02, "pesosHistoricos", "Pesos historicos"),
            ],
        };
    }
}

export async function getHomeDashboardCached(client: string): Promise<HomeDashboardData> {
    const now = Date.now();
    const cached = homeDashboardCache.get(client);
    if (cached && cached.expiresAt > now) {
        return cached.data;
    }

    const inflight = homeDashboardInflight.get(client);
    if (inflight) return inflight;

    const promise = (async () => {
        const data = await new Home(client).getDashboard();
        homeDashboardCache.set(client, {
            data,
            expiresAt: Date.now() + HOME_DASHBOARD_CACHE_TTL_MS,
        });
        return data;
    })();

    homeDashboardInflight.set(client, promise);
    try {
        return await promise;
    } finally {
        homeDashboardInflight.delete(client);
    }
}

export default Home;
