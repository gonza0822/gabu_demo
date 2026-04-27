'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Alert from "@/components/ui/Alert";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import type { BookParamBounds, BookPeriodBoundsByBook, ReportType } from "@/lib/models/reports/Reports";
import Select from "@/components/ui/Select";
import Excel from "@/components/svg/Excel";
import CollapseAllIcon from "@/components/svg/CollapseAllIcon";
import ExpandAllIcon from "@/components/svg/ExpandAllIcon";
import ExcelJS from "exceljs";
import { formatNumberEs } from "@/util/number/formatNumberEs";

const EXCEL_NUMBER_FORMAT = "#,##0.00";

type ReportBookOption = {
    key: string;
    value: string;
    tableName: string;
};

type ReportsConfigResponse = {
    books: ReportBookOption[];
    defaultPeriod: string;
    periods: string[];
    paramBoundsByBook?: Record<string, BookParamBounds>;
    periodBoundsByBook?: BookPeriodBoundsByBook;
};

const REPORTS: { key: ReportType; label: string }[] = [
    { key: "ANEXO", label: "Anexo" },
    { key: "DETALLE_ACTIVO", label: "Detalle activo" },
    { key: "ALTAS_ACTIVO", label: "Altas activo" },
    { key: "BAJAS_ACTIVO", label: "Bajas activo" },
    { key: "TRANSFERENCIAS_ACTIVO", label: "Transferencias activo" },
    { key: "ASIENTOS", label: "Asientos" },
];

const REPORT_HEADERS: Record<ReportType, string[]> = {
    ANEXO: [
        "Clase",
        "Descripción",
        "Valores Inicio",
        "Valores Altas",
        "Valores Bajas",
        "Transferencias",
        "Valores Cierre",
        "Amot. Ac.Inicio",
        "Amort.Bajas",
        "Amot.Ejercicio",
        "Amot.Cierre",
        "Neto Resultante",
    ],
    DETALLE_ACTIVO: [
        "Cta.Activo",
        "Centro de costo",
        "Planta",
        "Zona",
        "Proyecto",
        "Código",
        "Cantidad",
        "Descripción",
        "Proveedor",
        "Nro.Factura",
        "Nro.OT",
        "Identificacion",
        "F.Origen",
        "F.Dep.",
        "F.Fin",
        "F.Baja",
        "Vida util",
        "Vida Rest.",
        "Valor actual.",
        "Amort.Acum.",
        "Amort.Ejercicio",
        "neto",
        "Amort.Periodo",
    ],
    ALTAS_ACTIVO: [
        "Cta.Activo",
        "Centro de costo",
        "Planta",
        "Zona",
        "Proyecto",
        "Código",
        "Cantidad",
        "Descripción",
        "Proveedor",
        "Nro.Factura",
        "Nro.OT",
        "Identificacion",
        "F.Origen",
        "F.Dep.",
        "F.Fin",
        "F.Baja",
        "Vida util",
        "Vida Rest.",
        "Valor actual.",
        "Amort.Acum.",
        "Amort.Ejercicio",
        "neto",
        "Amort.Periodo",
    ],
    BAJAS_ACTIVO: [
        "Cta.Activo",
        "Centro de costo",
        "Planta",
        "Zona",
        "Proyecto",
        "Código",
        "Cantidad",
        "Descripción",
        "Proveedor",
        "Nro.Factura",
        "Nro.OT",
        "Identificacion",
        "F.Origen",
        "F.Dep.",
        "F.Fin",
        "F.Baja",
        "Vida util",
        "Vida Rest.",
        "Valor actual.",
        "Amort.Acum.",
        "Amort.Ejercicio",
        "neto",
        "Amort.Periodo",
    ],
    TRANSFERENCIAS_ACTIVO: [
        "Cta.Activo",
        "Centro de costo",
        "Planta",
        "Zona",
        "Proyecto",
        "Código",
        "Cantidad",
        "Descripción",
        "Proveedor",
        "Nro.Factura",
        "Nro.OT",
        "Identificacion",
        "F.Origen",
        "F.Dep.",
        "F.Fin",
        "F.Baja",
        "Vida util",
        "Vida Rest.",
        "Valor actual.",
        "Amort.Acum.",
        "Amort.Ejercicio",
        "neto",
        "Amort.Periodo",
    ],
    ASIENTOS: [
        "referencia",
        "idAsiento",
        "FechaProceso",
        "idMoneda",
        "idGrupo",
        "idEmpresa",
        "idUnegocio",
        "idActivo",
        "idCencos",
        "idProyecto",
        "idZona",
        "idPlanta",
        "descripcion",
        "tipoimporte",
        "impdol",
        "debe",
        "haber",
    ],
};

/** Solo columnas que no vienen de ConverField (referencia, debe, haber). */
const ASIENTOS_FALLBACK_LABELS: Record<string, string> = {
    referencia: "Referencia",
    tipoimporte: "Tipo importe",
    debe: "Debe",
    haber: "Haber",
};

const ANEXO_COLUMN_LABELS: Record<string, string> = {
    clase: "Clase",
    idactivo: "Clase",
    descripcion: "Descripción",
    descrip: "Descripción",
    voinicio: "Valores Inicio",
    voaltas: "Valores Altas",
    vobajas: "Valores Bajas",
    votransfe: "Transferencias",
    vocierre: "Valores Cierre",
    aainicio: "Amot. Ac.Inicio",
    amoacininicio: "Amot. Ac.Inicio",
    amobajas: "Amort.Bajas",
    aejercicio: "Amot.Ejercicio",
    amoejercicio: "Amot.Ejercicio",
    amcierre: "Amot.Cierre",
    amocierre: "Amot.Cierre",
    neto: "Neto Resultante",
    netoresul: "Neto Resultante",
    netoresultante: "Neto Resultante",
};

const DETAIL_COLUMN_LABELS: Record<string, string> = {
    idactivo: "Cta.Activo",
    idcencos: "Centro de costo",
    idplanta: "Planta",
    idzona: "Zona",
    idproyecto: "Proyecto",
    codigo: "Código",
    cantidad: "Cantidad",
    descripcion: "Descripción",
    idproveedor: "Proveedor",
    idfactura: "Nro.Factura",
    idordencompra: "Nro.OT",
    identificacion: "Identificacion",
    fecori: "F.Origen",
    fecdep: "F.Dep.",
    fecini: "F.Fin",
    fecbaj: "F.Baja",
    vidautil: "Vida util",
    vidarestante: "Vida Rest.",
    vrepeactual: "Valor actual.",
    vrepoeactual: "Valor actual.",
    amafeactual: "Amort.Acum.",
    amafieactual: "Amort.Acum.",
    amefeactual: "Amort.Ejercicio",
    amefieactual: "Amort.Ejercicio",
    neto: "neto",
    ampefeactual: "Amort.Periodo",
    ampefeactua: "Amort.Periodo",
    amorefecactual: "Amort.Periodo",
    amorefecactua: "Amort.Periodo",
    tridactivo: "Cuenta origen",
    trfecactivo: "Fecha de transferencia",
};

function isValidYYYYMM(value: string): boolean {
    if (!/^\d{6}$/.test(value)) return false;
    const month = Number(value.slice(4, 6));
    return month >= 1 && month <= 12;
}

function toDateOnlyString(value: unknown): string | null {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return value.toISOString().slice(0, 10);
    }
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed)) return trimmed.slice(0, 10);
    return null;
}

function normalizeCellValue(value: unknown): string {
    if (value == null) return "";
    const dateOnly = toDateOnlyString(value);
    if (dateOnly) return dateOnly;
    return String(value);
}

function toNumericValue(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const normalized = trimmed
        .replace(/\s+/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function getAnexoHeaderLabel(column: string): string {
    const normalized = column.trim().toLowerCase().replace(/\s+/g, "").replace(/[_\-.]/g, "");
    return ANEXO_COLUMN_LABELS[normalized] ?? column;
}

function getDetailHeaderLabel(column: string): string {
    const normalized = column.trim().toLowerCase().replace(/\s+/g, "").replace(/[_\-.]/g, "");
    const direct = DETAIL_COLUMN_LABELS[normalized];
    if (direct) return direct;

    // Compatibilidad con aliases históricos de stores SQL.
    if (normalized.startsWith("vrepe") || normalized.startsWith("vrepoe")) return "Valor actual.";
    if (normalized.startsWith("amafe") || normalized.startsWith("amafie")) return "Amort.Acum.";
    if (normalized.startsWith("amefe") || normalized.startsWith("amefie")) return "Amort.Ejercicio";
    if (normalized.startsWith("ampefe") || normalized.startsWith("amorefec")) return "Amort.Periodo";
    if (normalized.startsWith("tridactivo")) return "trIdActivo (Cuenta origen)";
    if (normalized.startsWith("trfecactivo")) return "trFecActivo (Fecha de transferencia)";
    if (normalized === "neto") return "neto";

    return column;
}

function getAsientosHeaderLabel(column: string, browNombreByField: Record<string, string>): string {
    const n = normalizeColumnKey(column);
    const fromDb = browNombreByField[n];
    if (fromDb) return fromDb;
    return ASIENTOS_FALLBACK_LABELS[n] ?? getDetailHeaderLabel(column);
}

function normalizeColumnKey(column: string): string {
    return column.trim().toLowerCase().replace(/\s+/g, "").replace(/[_\-.]/g, "");
}

function isDetailTotalColumn(column: string): boolean {
    const raw = normalizeColumnKey(column);
    const label = normalizeColumnKey(getDetailHeaderLabel(column));

    const isValorActual = raw === "vrepeactual" || raw === "valoractual" || label === "valoractual";
    const isAmortAcum = raw === "amafeactual" || raw === "amortacum" || label === "amortacum";
    const isAmortEjercicio = raw === "amefeactual" || raw === "amortejercicio" || label === "amortejercicio";
    const isNeto = raw === "neto" || label === "neto";
    const isAmortPeriodo = raw === "amorefecactual" || raw === "amortperiodo" || label === "amortperiodo";

    return isValorActual || isAmortAcum || isAmortEjercicio || isNeto || isAmortPeriodo;
}

function getDetailTotalColumns(columns: string[]): Set<string> {
    const byName = columns.filter((column) => isDetailTotalColumn(column));
    if (byName.length >= 5) return new Set(byName);

    // Fallback robusto: usar las últimas 5 columnas visibles.
    const lastFive = columns.slice(Math.max(0, columns.length - 5));
    return new Set([...byName, ...lastFive]);
}

function isIdentifierColumn(column: string): boolean {
    const normalized = column.trim().toLowerCase().replace(/\s+/g, "").replace(/[_\-.]/g, "");
    return (
        normalized.startsWith("id") ||
        normalized.startsWith("tridactivo") ||
        normalized === "codigo" ||
        normalized === "clase" ||
        normalized === "cantidad"
    );
}

/** En Excel los números deben ser tipo número (no `formatNumberEs`, que es texto para la UI). */
function excelExportCellValue(value: unknown, column: string): string | number {
    if (value == null || value === "") return "";
    const nCol = normalizeColumnKey(column);
    if (isIdentifierColumn(column) && nCol !== "cantidad") {
        return normalizeCellValue(value);
    }
    const numeric = toNumericValue(value);
    if (numeric != null) return numeric;
    return normalizeCellValue(value);
}

function excelCellIsNumeric(value: unknown, column: string): boolean {
    const nCol = normalizeColumnKey(column);
    if (isIdentifierColumn(column) && nCol !== "cantidad") return false;
    return toNumericValue(value) != null;
}

function formatCellValue(value: unknown, column: string): string {
    const raw = normalizeCellValue(value);
    if (raw === "") return raw;
    if (isIdentifierColumn(column)) return raw;
    const numeric = toNumericValue(value);
    if (numeric == null) return raw;
    return formatNumberEs(numeric, 2, 2);
}

function formatPeriodToMMYYYY(period: string): string {
    if (!/^\d{6}$/.test(period)) return period;
    return `${period.slice(4, 6)}/${period.slice(0, 4)}`;
}

function isSummaryCell(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("subtotal ") || normalized.startsWith("total ");
}

function isSummaryRow(row: Record<string, unknown>): boolean {
    return Object.values(row).some((value) => isSummaryCell(value));
}

type SubtotalAcc = {
    sumByColumn: Record<string, number>;
    hasNumericByColumn: Record<string, boolean>;
};

function createEmptySubtotalAcc(detailTotalColumns: Set<string>): SubtotalAcc {
    const sumByColumn: Record<string, number> = {};
    const hasNumericByColumn: Record<string, boolean> = {};
    for (const column of detailTotalColumns) {
        sumByColumn[column] = 0;
        hasNumericByColumn[column] = false;
    }
    return { sumByColumn, hasNumericByColumn };
}

function resetSubtotalAcc(acc: SubtotalAcc, detailTotalColumns: Set<string>): void {
    for (const column of detailTotalColumns) {
        acc.sumByColumn[column] = 0;
        acc.hasNumericByColumn[column] = false;
    }
}

function addRowToSubtotalAcc(acc: SubtotalAcc, row: Record<string, unknown>, detailTotalColumns: Set<string>): void {
    for (const column of detailTotalColumns) {
        const numeric = toNumericValue(row[column]);
        if (numeric == null) continue;
        acc.sumByColumn[column] += numeric;
        acc.hasNumericByColumn[column] = true;
    }
}

/** `level`: 0 = primera columna de agrupación, 1 = segunda, etc. La etiqueta va en esa columna (como Excel). */
function buildHierarchicalSubtotalRow(
    columns: string[],
    subtotalGroupColumns: string[],
    detailTotalColumns: Set<string>,
    level: number,
    prefixValues: string[],
    acc: SubtotalAcc
): Record<string, unknown> {
    const subtotalRow: Record<string, unknown> = {};
    const labelCol = subtotalGroupColumns[level];
    const label = `Total ${(prefixValues[level] ?? "").trim()}`;
    for (const column of columns) {
        if (column === labelCol) {
            subtotalRow[column] = label;
            continue;
        }
        if (subtotalGroupColumns.includes(column)) {
            subtotalRow[column] = "";
            continue;
        }
        if (!detailTotalColumns.has(column)) {
            subtotalRow[column] = "";
            continue;
        }
        subtotalRow[column] = acc.hasNumericByColumn[column] ? acc.sumByColumn[column] : "";
    }
    return subtotalRow;
}

function nestedCollapseKey(level: number, prefixValues: string[]): string {
    return `${level}:${prefixValues.join("||")}`;
}

type RenderRowMeta = {
    kind: "data" | "subtotal" | "total";
    /** Clave para subtotales / compat. Asientos */
    groupKey?: string;
    /** Si alguna está colapsada, la fila de detalle se oculta (reportes con subtotales anidados). */
    nestedGroupKeys?: string[];
    /** Nivel de esquema en Excel (0 = total / exterior; mayores = más anidado). */
    outlineLevel?: number;
};

type RenderModel = {
    rows: Record<string, unknown>[];
    meta: RenderRowMeta[];
    groupKeys: string[];
};

export default function ReportsEmission({ simulationOnly = false }: { simulationOnly?: boolean }): React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const [reportType, setReportType] = useState<ReportType>("ANEXO");
    const [generatedReportType, setGeneratedReportType] = useState<ReportType>("ANEXO");
    const [books, setBooks] = useState<ReportBookOption[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedBookKey, setSelectedBookKey] = useState<string>("");
    const [period, setPeriod] = useState<string>("");
    const [subtotalColumns, setSubtotalColumns] = useState<string>("0");
    const [periodError, setPeriodError] = useState<string | null>(null);
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [hasGenerated, setHasGenerated] = useState<boolean>(false);
    const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
    const [running, setRunning] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const bottomScrollbarRef = useRef<HTMLDivElement | null>(null);
    const tableHorizontalRef = useRef<HTMLDivElement | null>(null);
    const scrollSyncLockRef = useRef(false);
    const [tableScrollWidth, setTableScrollWidth] = useState(0);
    const [asientosBrowLabels, setAsientosBrowLabels] = useState<Record<string, string>>({});
    const [paramBoundsByBook, setParamBoundsByBook] = useState<Record<string, BookParamBounds>>({});
    const [periodBoundsByBook, setPeriodBoundsByBook] = useState<BookPeriodBoundsByBook>({});
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [dateRangeError, setDateRangeError] = useState<string | null>(null);

    const enabledReports = useMemo(
        () => (simulationOnly ? REPORTS.filter((r) => r.key === "ANEXO" || r.key === "DETALLE_ACTIVO") : REPORTS),
        [simulationOnly]
    );
    const selectedBook = useMemo(
        () => books.find((book) => book.key === selectedBookKey) ?? null,
        [books, selectedBookKey]
    );
    const displayedReportType = hasGenerated ? generatedReportType : reportType;

    const columns = useMemo(
        () => (rows.length > 0 ? Object.keys(rows[0]) : REPORT_HEADERS[displayedReportType]),
        [displayedReportType, rows]
    );
    const renderModel = useMemo<RenderModel>(() => {
        if (rows.length === 0 || columns.length === 0) {
            return { rows, meta: rows.map(() => ({ kind: "data" })), groupKeys: [] };
        }

        if (displayedReportType === "ASIENTOS") {
            const renderedRows: Record<string, unknown>[] = [];
            const renderedMeta: RenderRowMeta[] = [];
            const groupKeysSet = new Set<string>();

            let prevAsiento: string | null = null;
            let accDebe = 0;
            let accHaber = 0;

            const asientoLabelCol = columns.includes("idAsiento") ? "idAsiento" : "referencia";

            const pushGroupSubtotal = (asientoKey: string, debe: number, haber: number) => {
                const subtotalRow: Record<string, unknown> = {};
                for (const column of columns) {
                    if (column === asientoLabelCol) {
                        subtotalRow[column] = `Total ${asientoKey}`;
                    } else if (column === "debe") {
                        subtotalRow[column] = debe;
                    } else if (column === "haber") {
                        subtotalRow[column] = haber;
                    } else {
                        subtotalRow[column] = "";
                    }
                }
                const gk = nestedCollapseKey(0, [asientoKey]);
                renderedRows.push(subtotalRow);
                renderedMeta.push({ kind: "subtotal", groupKey: gk, outlineLevel: 0 });
                groupKeysSet.add(gk);
            };

            for (const row of rows) {
                const ida = normalizeCellValue(row.idAsiento);
                if (prevAsiento !== null && ida !== prevAsiento) {
                    pushGroupSubtotal(prevAsiento, accDebe, accHaber);
                    accDebe = 0;
                    accHaber = 0;
                }
                prevAsiento = ida;
                renderedRows.push(row);
                const nk = nestedCollapseKey(0, [ida]);
                renderedMeta.push({ kind: "data", groupKey: nk, nestedGroupKeys: [nk], outlineLevel: 1 });
                accDebe += toNumericValue(row.debe) ?? 0;
                accHaber += toNumericValue(row.haber) ?? 0;
            }
            if (prevAsiento !== null) {
                pushGroupSubtotal(prevAsiento, accDebe, accHaber);
            }

            let grandDebe = 0;
            let grandHaber = 0;
            for (const row of rows) {
                grandDebe += toNumericValue(row.debe) ?? 0;
                grandHaber += toNumericValue(row.haber) ?? 0;
            }
            const totalsRow: Record<string, unknown> = {};
            for (const column of columns) {
                if (column === asientoLabelCol) {
                    totalsRow[column] = "Total general";
                } else if (column === "debe") {
                    totalsRow[column] = grandDebe;
                } else if (column === "haber") {
                    totalsRow[column] = grandHaber;
                } else {
                    totalsRow[column] = "";
                }
            }

            return {
                rows: [...renderedRows, totalsRow],
                meta: [...renderedMeta, { kind: "total", outlineLevel: 0 }],
                groupKeys: Array.from(groupKeysSet),
            };
        }

        if (displayedReportType !== "ANEXO") {
            const detailTotalColumns = getDetailTotalColumns(columns);
            const subtotalDepth = Number(subtotalColumns);
            const enabledSubtotalDepth =
                Number.isInteger(subtotalDepth) && subtotalDepth > 0 ? Math.min(subtotalDepth, columns.length) : 0;
            const subtotalGroupColumns = enabledSubtotalDepth > 0 ? columns.slice(0, enabledSubtotalDepth) : [];

            const renderedRows: Record<string, unknown>[] = [];
            const renderedMeta: RenderRowMeta[] = [];
            const groupKeysSet = new Set<string>();

            if (subtotalGroupColumns.length > 0) {
                const D = subtotalGroupColumns.length;
                const sumsAtLevel: SubtotalAcc[] = Array.from({ length: D }, () => createEmptySubtotalAcc(detailTotalColumns));

                const buildGroupValues = (row: Record<string, unknown>): string[] =>
                    subtotalGroupColumns.map((column) => normalizeCellValue(row[column]));

                const emitLevel = (level: number, keyValues: string[]) => {
                    const acc = sumsAtLevel[level];
                    const prefix = keyValues.slice(0, level + 1);
                    const subtotalRow = buildHierarchicalSubtotalRow(
                        columns,
                        subtotalGroupColumns,
                        detailTotalColumns,
                        level,
                        prefix,
                        acc
                    );
                    const gk = nestedCollapseKey(level, prefix);
                    renderedRows.push(subtotalRow);
                    renderedMeta.push({
                        kind: "subtotal",
                        groupKey: gk,
                        outlineLevel: level,
                    });
                    groupKeysSet.add(gk);
                    resetSubtotalAcc(acc, detailTotalColumns);
                };

                let prevValues: string[] | null = null;

                for (const row of rows) {
                    const gv = buildGroupValues(row);
                    if (prevValues !== null) {
                        let diff = D;
                        for (let i = 0; i < D; i++) {
                            if (gv[i] !== prevValues[i]) {
                                diff = i;
                                break;
                            }
                        }
                        if (diff < D) {
                            for (let L = D - 1; L >= diff; L--) {
                                emitLevel(L, prevValues);
                            }
                        }
                    }

                    for (let level = 0; level < D; level++) {
                        addRowToSubtotalAcc(sumsAtLevel[level], row, detailTotalColumns);
                    }

                    const nestedKeys = gv.map((_, idx) => nestedCollapseKey(idx, gv.slice(0, idx + 1)));
                    renderedRows.push(row);
                    renderedMeta.push({
                        kind: "data",
                        nestedGroupKeys: nestedKeys,
                        outlineLevel: D,
                    });

                    prevValues = gv;
                }

                if (prevValues !== null) {
                    for (let L = D - 1; L >= 0; L--) {
                        emitLevel(L, prevValues);
                    }
                }
            } else {
                renderedRows.push(...rows);
                renderedMeta.push(...rows.map(() => ({ kind: "data" as const })));
            }

            const totalsRow: Record<string, unknown> = {};
            for (const column of columns) {
                if (column === columns[0]) {
                    totalsRow[column] = "Total general";
                    continue;
                }

                if (!detailTotalColumns.has(column)) {
                    totalsRow[column] = "";
                    continue;
                }

                let sum = 0;
                let hasNumeric = false;
                for (const row of rows) {
                    const numeric = toNumericValue(row[column]);
                    if (numeric == null) continue;
                    sum += numeric;
                    hasNumeric = true;
                }
                totalsRow[column] = hasNumeric ? sum : "";
            }

            return {
                rows: [...renderedRows, totalsRow],
                meta: [...renderedMeta, { kind: "total", outlineLevel: 0 }],
                groupKeys: Array.from(groupKeysSet),
            };
        }

        const isIdActivoKey = (key: string): boolean => key.toLowerCase() === "idactivo";
        const isDescripcionKey = (key: string): boolean => key.toLowerCase() === "descripcion";

        const totalsRow: Record<string, unknown> = {};

        for (const column of columns) {
            if (isIdActivoKey(column)) {
                totalsRow[column] = "Total general";
                continue;
            }
            if (isDescripcionKey(column)) {
                totalsRow[column] = "";
                continue;
            }

            let sum = 0;
            let hasNumeric = false;
            for (const row of rows) {
                const numeric = toNumericValue(row[column]);
                if (numeric == null) continue;
                sum += numeric;
                hasNumeric = true;
            }
            totalsRow[column] = hasNumeric ? sum : "";
        }

        if (!columns.some((c) => isIdActivoKey(c))) {
            totalsRow[columns[0]] = "Total general";
            const descripcionColumn = columns.find((c) => isDescripcionKey(c));
            if (descripcionColumn) totalsRow[descripcionColumn] = "";
        }

        return {
            rows: [...rows, totalsRow],
            meta: [...rows.map(() => ({ kind: "data" as const })), { kind: "total" }],
            groupKeys: [],
        };
    }, [columns, displayedReportType, rows, subtotalColumns]);

    const showOutlineGutter = useMemo(
        () =>
            hasGenerated &&
            displayedReportType !== "ANEXO" &&
            (displayedReportType === "ASIENTOS" ||
                (Number(subtotalColumns) > 0 && renderModel.groupKeys.length > 0)),
        [hasGenerated, displayedReportType, subtotalColumns, renderModel.groupKeys.length]
    );

    const selectedReportLabel = useMemo(
        () => enabledReports.find((report) => report.key === displayedReportType)?.label ?? "Reporte",
        [displayedReportType, enabledReports]
    );

    const currentBookParamBounds = paramBoundsByBook[selectedBookKey] ?? { fecini: null, fecpro: null };
    const currentDateBounds = useMemo(() => {
        const paramFecproPeriod = currentBookParamBounds.fecpro ? currentBookParamBounds.fecpro.slice(0, 7).replace("-", "") : null;
        const useParamBounds = !!paramFecproPeriod && period === paramFecproPeriod;
        if (useParamBounds) {
            return { ...currentBookParamBounds, source: "parametros" as const };
        }
        const cierreBounds = periodBoundsByBook[selectedBookKey]?.[period] ?? { fecini: null, fecpro: null };
        return { ...cierreBounds, source: "cierres" as const };
    }, [currentBookParamBounds, period, periodBoundsByBook, selectedBookKey]);

    const needsReportDateRange =
        reportType === "ALTAS_ACTIVO" || reportType === "BAJAS_ACTIVO" || reportType === "TRANSFERENCIAS_ACTIVO";

    const reportSelectCompactClass =
        "min-h-[1.5rem] 2xl:min-h-0 [&_span]:!text-[10px] 2xl:[&_span]:!text-sm !py-0.5 !px-1.5 2xl:!py-1 2xl:!px-2";
    const bookOptions = useMemo(() => {
        const list =
            reportType === "ASIENTOS"
                ? books.filter((b) => b.key !== "im" && b.tableName?.trim().toLowerCase() !== "impuestos")
                : books;
        return list.map((book) => ({ key: book.key, value: book.value }));
    }, [books, reportType]);
    const periodOptions = useMemo(
        () => periods.map((value) => ({ key: value, value })),
        [periods]
    );
    const subtotalOptions = useMemo(() => {
        const max = Math.max(Math.min(columns.length, 5), 0);
        return Array.from({ length: max + 1 }, (_, index) => {
            const value = String(index);
            return { key: value, value };
        });
    }, [columns.length]);

    useEffect(() => {
        const tableEl = tableHorizontalRef.current;
        if (!tableEl) return;

        const updateWidth = () => {
            setTableScrollWidth(tableEl.scrollWidth);
        };

        updateWidth();
        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(tableEl);
        if (tableEl.firstElementChild) resizeObserver.observe(tableEl.firstElementChild);
        window.addEventListener("resize", updateWidth);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateWidth);
        };
    }, [columns, hasGenerated, renderModel.rows.length]);

    useEffect(() => {
        let cancelled = false;
        async function loadConfig(): Promise<void> {
            if (!client) return;
            setLoadingConfig(true);
            setErrorMessage(null);
            try {
                const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "GetConfig",
                        client,
                        data: { simulationOnly },
                    }),
                });
                const data = (await res.json()) as ReportsConfigResponse | { message?: string };
                if (!res.ok) {
                    throw new Error((data as { message?: string }).message ?? "Error cargando configuración de reportes");
                }
                if (cancelled) return;
                const config = data as ReportsConfigResponse;
                setBooks(config.books ?? []);
                setPeriods(config.periods ?? []);
                setParamBoundsByBook(config.paramBoundsByBook ?? {});
                setPeriodBoundsByBook(config.periodBoundsByBook ?? {});
                setSelectedBookKey(config.books?.[0]?.key ?? "");
                setPeriod(config.defaultPeriod ?? "");
            } catch (err) {
                if (cancelled) return;
                setErrorMessage(err instanceof Error ? err.message : String(err));
                setShowErrorAlert(true);
            } finally {
                if (!cancelled) setLoadingConfig(false);
            }
        }

        void loadConfig();
        return () => {
            cancelled = true;
        };
    }, [client, simulationOnly]);

    useEffect(() => {
        const b = currentDateBounds;
        if (b?.fecini && b?.fecpro) {
            setDateFrom(b.fecini);
            setDateTo(b.fecpro);
        } else {
            setDateFrom("");
            setDateTo("");
        }
        setDateRangeError(null);
    }, [currentDateBounds]);

    useEffect(() => {
        if (reportType === "ASIENTOS") setSubtotalColumns("0");
    }, [reportType]);

    useEffect(() => {
        if (reportType !== "ASIENTOS") return;
        const current = books.find((b) => b.key === selectedBookKey);
        const invalid =
            selectedBookKey === "im" || current?.tableName?.trim().toLowerCase() === "impuestos";
        if (!invalid) return;
        const first = books.find((b) => b.key !== "im" && b.tableName?.trim().toLowerCase() !== "impuestos");
        if (first) setSelectedBookKey(first.key);
    }, [reportType, books, selectedBookKey]);

    const showAsientosUi = reportType === "ASIENTOS" || displayedReportType === "ASIENTOS";

    useEffect(() => {
        if (!showAsientosUi) {
            setAsientosBrowLabels({});
            return;
        }
        if (!client || !selectedBook) {
            setAsientosBrowLabels({});
            return;
        }
        if (selectedBook.key === "im" || selectedBook.tableName?.trim().toLowerCase() === "impuestos") {
            setAsientosBrowLabels({});
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "GetAsientosFieldLabels",
                        client,
                        data: { book: selectedBook.key, bookTableName: selectedBook.tableName },
                    }),
                });
                const data = (await res.json()) as { labels?: Record<string, string>; message?: string };
                if (cancelled) return;
                if (res.ok && data.labels && typeof data.labels === "object") {
                    setAsientosBrowLabels(data.labels);
                } else {
                    setAsientosBrowLabels({});
                }
            } catch {
                if (!cancelled) setAsientosBrowLabels({});
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [showAsientosUi, client, selectedBook]);

    const runReport = useCallback(async () => {
        if (!client || running) return;
        if (!selectedBook) {
            setErrorMessage("Debe seleccionar un libro");
            setShowErrorAlert(true);
            return;
        }
        if (reportType !== "ASIENTOS") {
            if (!isValidYYYYMM(period)) {
                setPeriodError("El período debe tener formato YYYYMM");
                return;
            }
        }
        setPeriodError(null);

        if (needsReportDateRange) {
            const bounds = currentDateBounds;
            if (!bounds?.fecini || !bounds?.fecpro) {
                setDateRangeError(
                    bounds.source === "parametros"
                        ? "No hay fecini y fecpro en parámetros para este libro."
                        : "No hay fecini y fecpro en cierres para el período seleccionado."
                );
                return;
            }
            if (!dateFrom.trim() || !dateTo.trim()) {
                setDateRangeError("Indicá fecha desde y hasta.");
                return;
            }
            if (dateFrom > dateTo) {
                setDateRangeError("La fecha desde no puede ser posterior a la fecha hasta.");
                return;
            }
            if (dateFrom < bounds.fecini || dateTo > bounds.fecpro) {
                setDateRangeError(
                    bounds.source === "parametros"
                        ? `Las fechas deben estar entre ${bounds.fecini} y ${bounds.fecpro} (fecini y fecpro de parámetros).`
                        : `Las fechas deben estar entre ${bounds.fecini} y ${bounds.fecpro} (fecini y fecpro de cierres).`
                );
                return;
            }
            setDateRangeError(null);
        } else {
            setDateRangeError(null);
        }
        setRunning(true);
        setHasGenerated(false);
        setErrorMessage(null);
        setSuccessMessage(null);
        setShowErrorAlert(false);
        setShowSuccessAlert(false);
        setCollapsedGroups(new Set());
        try {
            const generatePayload: {
                reportType: ReportType;
                book: string;
                bookTableName: string;
                period: string;
                dateFrom?: string;
                dateTo?: string;
            } = {
                reportType,
                book: selectedBook.key,
                bookTableName: selectedBook.tableName,
                period,
            };
            if (needsReportDateRange) {
                generatePayload.dateFrom = dateFrom.trim();
                generatePayload.dateTo = dateTo.trim();
            }

            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Generate",
                    client,
                    data: generatePayload,
                }),
            });
            const data = (await res.json()) as Record<string, unknown>[] | { message?: string };
            if (!res.ok) {
                throw new Error((data as { message?: string }).message ?? "Error generando el reporte");
            }
            const resultRows = Array.isArray(data) ? data : [];
            setRows(resultRows);
            setGeneratedReportType(reportType);
            setHasGenerated(true);
            setSuccessMessage(`${enabledReports.find((r) => r.key === reportType)?.label ?? "Reporte"} generado correctamente`);
            setShowSuccessAlert(true);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : String(err));
            setShowErrorAlert(true);
        } finally {
            setRunning(false);
        }
    }, [
        client,
        dateFrom,
        dateTo,
        enabledReports,
        needsReportDateRange,
        currentDateBounds,
        period,
        reportType,
        running,
        selectedBook,
        selectedBookKey,
    ]);

    useEffect(() => {
        if (!enabledReports.some((report) => report.key === reportType)) {
            setReportType(enabledReports[0]?.key ?? "ANEXO");
        }
    }, [enabledReports, reportType]);

    const handleBookSelect = useCallback(
        (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
            const target = e.target as HTMLLIElement;
            const selectedKey = target.dataset.key ?? "";
            const selectedValue = target.textContent ?? "";
            if (ref.current) {
                ref.current.textContent = selectedValue;
                ref.current.dataset.key = selectedKey;
            }
            setSelectedBookKey(selectedKey);
        },
        []
    );

    const handlePeriodSelect = useCallback(
        (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
            const target = e.target as HTMLLIElement;
            const selectedKey = target.dataset.key ?? "";
            const selectedValue = target.textContent ?? "";
            if (ref.current) {
                ref.current.textContent = selectedValue;
                ref.current.dataset.key = selectedKey;
            }
            setPeriod(selectedKey);
            if (periodError) setPeriodError(null);
        },
        [periodError]
    );

    const handleSubtotalSelect = useCallback(
        (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
            const target = e.target as HTMLLIElement;
            const selectedKey = target.dataset.key ?? "0";
            const selectedValue = target.textContent ?? "";
            if (ref.current) {
                ref.current.textContent = selectedValue;
                ref.current.dataset.key = selectedKey;
            }
            setSubtotalColumns(selectedKey);
        },
        []
    );

    useEffect(() => {
        const current = Number(subtotalColumns);
        if (!Number.isInteger(current) || current < 0) {
            setSubtotalColumns("0");
            return;
        }
        if (current > columns.length) {
            setSubtotalColumns(String(columns.length));
        }
    }, [columns.length, subtotalColumns]);

    useEffect(() => {
        setCollapsedGroups((prev) => {
            if (prev.size === 0) return prev;
            const valid = new Set(renderModel.groupKeys);
            const next = new Set<string>();
            prev.forEach((key) => {
                if (valid.has(key)) next.add(key);
            });
            return next;
        });
    }, [renderModel.groupKeys]);

    const toggleGroupCollapse = useCallback((groupKey: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
    }, []);

    const collapseAllGroups = useCallback(() => {
        setCollapsedGroups(new Set(renderModel.groupKeys));
    }, [renderModel.groupKeys]);

    const expandAllGroups = useCallback(() => {
        setCollapsedGroups(new Set());
    }, []);

    const syncFromBottomScrollbar = useCallback(() => {
        if (!bottomScrollbarRef.current || !tableHorizontalRef.current) return;
        if (scrollSyncLockRef.current) return;
        scrollSyncLockRef.current = true;
        tableHorizontalRef.current.scrollLeft = bottomScrollbarRef.current.scrollLeft;
        requestAnimationFrame(() => {
            scrollSyncLockRef.current = false;
        });
    }, []);

    const syncFromTableScrollbar = useCallback(() => {
        if (!bottomScrollbarRef.current || !tableHorizontalRef.current) return;
        if (scrollSyncLockRef.current) return;
        scrollSyncLockRef.current = true;
        bottomScrollbarRef.current.scrollLeft = tableHorizontalRef.current.scrollLeft;
        requestAnimationFrame(() => {
            scrollSyncLockRef.current = false;
        });
    }, []);

    const exportToExcel = useCallback(async () => {
        if (!hasGenerated) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(selectedReportLabel || "Reporte");

        const headers = columns.map((column) =>
            displayedReportType === "ANEXO"
                ? getAnexoHeaderLabel(column)
                : displayedReportType === "ASIENTOS"
                  ? getAsientosHeaderLabel(column, asientosBrowLabels)
                  : getDetailHeaderLabel(column)
        );
        const colCount = Math.max(headers.length, 1);
        const periodLabel = displayedReportType === "ASIENTOS" ? "—" : formatPeriodToMMYYYY(period);
        const bookLabel = selectedBook?.value ?? "";

        worksheet.addRow(["ADMAGRO"]);
        worksheet.mergeCells(1, 1, 1, colCount);
        worksheet.getCell(1, 1).font = { bold: true, size: 16 };

        worksheet.addRow([`${bookLabel} - ${periodLabel}`]);
        worksheet.mergeCells(2, 1, 2, colCount);
        worksheet.getCell(2, 1).font = { bold: true, size: 12 };

        worksheet.addRow([]);
        worksheet.addRow(headers);
        const headerRow = worksheet.getRow(4);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1C3551" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "left" };
        headerRow.height = 20;

        const sourceRows = rows.length === 0 ? [] : renderModel.rows;
        const outlineDepth =
            displayedReportType === "ASIENTOS" ? 1 : Math.max(0, Number(subtotalColumns) || 0);
        const useExcelRowOutlines =
            displayedReportType !== "ANEXO" &&
            renderModel.groupKeys.length > 0 &&
            sourceRows.length > 0 &&
            (displayedReportType === "ASIENTOS" || outlineDepth > 0);

        if (useExcelRowOutlines) {
            worksheet.properties.outlineProperties = { summaryBelow: true, summaryRight: true };
        }

        sourceRows.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(columns.map((column) => excelExportCellValue(row[column], column)));
            const meta = renderModel.meta[rowIndex];
            if (useExcelRowOutlines) {
                if (meta?.kind === "data" && outlineDepth > 0) {
                    excelRow.outlineLevel = Math.min(7, outlineDepth + 1);
                } else if (meta?.kind === "subtotal" && meta.outlineLevel != null) {
                    excelRow.outlineLevel = Math.min(7, meta.outlineLevel + 1);
                } else if (meta?.kind === "total") {
                    excelRow.outlineLevel = 0;
                }
            }
            columns.forEach((column, index) => {
                if (!excelCellIsNumeric(row[column], column)) return;
                const cell = excelRow.getCell(index + 1);
                cell.alignment = { ...(cell.alignment ?? {}), horizontal: "right" };
                cell.numFmt = EXCEL_NUMBER_FORMAT;
            });
            if (meta?.kind === "subtotal") {
                excelRow.eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { ...(cell.font ?? {}), bold: true };
                });
            }
        });

        worksheet.views = [{ state: "frozen", ySplit: 4 }];

        worksheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const value = cell.value == null ? "" : String(cell.value);
                maxLength = Math.max(maxLength, value.length + 2);
            });
            column.width = Math.min(60, maxLength);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Reporte_${selectedReportLabel.replace(/\s+/g, "_")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [
        columns,
        displayedReportType,
        hasGenerated,
        period,
        renderModel.groupKeys.length,
        renderModel.meta,
        renderModel.rows,
        rows,
        selectedBook?.value,
        selectedReportLabel,
        subtotalColumns,
        asientosBrowLabels,
    ]);

    return (
        <div className="w-full h-full overflow-hidden flex flex-col">
            <Alert
                message={errorMessage}
                type="error"
                show={showErrorAlert && !!errorMessage}
                onClose={() => {
                    setShowErrorAlert(false);
                    setErrorMessage(null);
                }}
            />
            <Alert
                message={successMessage}
                type="success"
                show={showSuccessAlert && !!successMessage}
                onClose={() => {
                    setShowSuccessAlert(false);
                    setSuccessMessage(null);
                }}
            />
            <div className="flex h-full min-h-0 w-full flex-col gap-2 p-3 pb-3 sm:p-3.5 2xl:gap-2.5 2xl:p-5 2xl:pb-4 [@media(max-height:600px)]:gap-1.5 [@media(max-height:600px)]:p-2.5">
                <div className="bg-gabu-500 rounded-md border border-gabu-900 px-3 py-2 sm:px-3.5 sm:py-2 2xl:px-5 2xl:py-2.5 flex flex-wrap items-center justify-between gap-2.5 2xl:gap-4 [@media(max-height:600px)]:py-1.5 [@media(max-height:600px)]:gap-2 [@media(max-height:600px)]:px-2.5">
                    <p className="text-gabu-100 text-xs 2xl:text-base pr-2">Emision de reportes</p>
                    <div className="flex flex-wrap items-center gap-2 2xl:gap-2.5">
                        {enabledReports.map((report) => (
                            <button
                                key={report.key}
                                type="button"
                                onClick={() => setReportType(report.key)}
                                className={`h-6 min-h-[1.5rem] px-2.5 rounded-md transition-colors duration-150 cursor-pointer text-[10px] leading-snug border disabled:opacity-60 disabled:cursor-not-allowed 2xl:h-7 2xl:px-3.5 2xl:text-xs [@media(max-height:600px)]:h-[1.375rem] [@media(max-height:600px)]:px-2 [@media(max-height:600px)]:text-[9px] ${
                                    reportType === report.key
                                        ? "bg-gabu-900 text-gabu-100 border-gabu-900"
                                        : "bg-gabu-700 text-gabu-100 border-gabu-900 hover:bg-gabu-900"
                                }`}
                                disabled={loadingConfig || running}
                            >
                                {report.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gabu-500 rounded-md border border-gabu-900 px-3 py-2 sm:px-3.5 sm:py-2 2xl:px-5 2xl:py-2.5 flex flex-nowrap items-center justify-between gap-2.5 2xl:gap-4 min-w-0 [@media(max-height:600px)]:py-1.5 [@media(max-height:600px)]:gap-2 [@media(max-height:600px)]:px-2.5">
                    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 2xl:gap-4">
                        <div className="flex items-center gap-1.5 2xl:gap-2">
                            <label className="text-gabu-100 text-[10px] 2xl:text-sm whitespace-nowrap shrink-0">Libro</label>
                            <div className="w-[7.5rem] sm:w-[8rem] 2xl:w-[8.75rem] shrink-0">
                                <Select
                                    label="Libro"
                                    hasLabel={false}
                                    isLogin={false}
                                    variant="abm"
                                    options={bookOptions}
                                    defaultValue={selectedBookKey}
                                    chooseOptionHandler={handleBookSelect}
                                    controlClassName={[
                                        loadingConfig || running ? "bg-gabu-300 pointer-events-none" : "",
                                        reportSelectCompactClass,
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 2xl:gap-1.5">
                            <div className="flex items-center gap-1.5 2xl:gap-2">
                                <label className="text-gabu-100 text-[10px] 2xl:text-sm whitespace-nowrap shrink-0">Periodo</label>
                                <div className="w-[5rem] 2xl:w-[5.5rem] shrink-0">
                                    <Select
                                        label="Periodo"
                                        hasLabel={false}
                                        isLogin={false}
                                        variant="abm"
                                        options={periodOptions}
                                        defaultValue={period}
                                        chooseOptionHandler={handlePeriodSelect}
                                        controlClassName={[
                                            loadingConfig || running || reportType === "ASIENTOS"
                                                ? "bg-gabu-300 pointer-events-none"
                                                : "",
                                            reportSelectCompactClass,
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    />
                                </div>
                            </div>
                            {periodError && <p className="text-[10px] 2xl:text-xs text-gabu-error">{periodError}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 2xl:gap-2">
                            <label className="text-gabu-100 text-[10px] 2xl:text-sm whitespace-nowrap shrink-0">Subtotales</label>
                            <div className="w-[2.625rem] 2xl:w-[2.875rem] shrink-0">
                                <Select
                                    label="Subtotales por columna"
                                    hasLabel={false}
                                    isLogin={false}
                                    variant="abm"
                                    options={subtotalOptions}
                                    defaultValue={subtotalColumns}
                                    chooseOptionHandler={handleSubtotalSelect}
                                    controlClassName={[
                                        loadingConfig || running || reportType === "ASIENTOS"
                                            ? "bg-gabu-300 pointer-events-none"
                                            : "",
                                        reportSelectCompactClass,
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                />
                            </div>
                        </div>
                        {needsReportDateRange && (
                            <div
                                className="flex flex-col gap-0.5 shrink-0 min-w-0 border-l border-gabu-900/30 pl-2.5 ml-0.5 2xl:pl-3 2xl:ml-1"
                                title="Altas: F.Origen (fecori). Bajas: F.Baja (fecbaj). Transferencias: fecha de transferencia (trfecactivo)."
                            >
                                <div className="flex flex-nowrap items-center gap-1.5 2xl:gap-2">
                                    <label
                                        className="text-gabu-100 text-[10px] 2xl:text-sm whitespace-nowrap shrink-0"
                                        htmlFor="report-date-from"
                                    >
                                        Desde
                                    </label>
                                    <input
                                        id="report-date-from"
                                        type="date"
                                        value={dateFrom}
                                        min={currentDateBounds.fecini ?? undefined}
                                        max={currentDateBounds.fecpro ?? undefined}
                                        onChange={(e) => {
                                            setDateFrom(e.target.value);
                                            setDateRangeError(null);
                                        }}
                                        disabled={loadingConfig || running}
                                        className="rounded-md border-0 bg-gabu-100 text-gabu-900 px-2 py-0.5 text-[10px] 2xl:text-xs min-h-[1.5rem] 2xl:min-h-[1.75rem] w-[7.25rem] 2xl:w-[8.5rem] shrink-0 disabled:opacity-60 [color-scheme:light]"
                                    />
                                    <label
                                        className="text-gabu-100 text-[10px] 2xl:text-sm whitespace-nowrap shrink-0"
                                        htmlFor="report-date-to"
                                    >
                                        Hasta
                                    </label>
                                    <input
                                        id="report-date-to"
                                        type="date"
                                        value={dateTo}
                                        min={currentDateBounds.fecini ?? undefined}
                                        max={currentDateBounds.fecpro ?? undefined}
                                        onChange={(e) => {
                                            setDateTo(e.target.value);
                                            setDateRangeError(null);
                                        }}
                                        disabled={loadingConfig || running}
                                        className="rounded-md border-0 bg-gabu-100 text-gabu-900 px-2 py-0.5 text-[10px] 2xl:text-xs min-h-[1.5rem] 2xl:min-h-[1.75rem] w-[7.25rem] 2xl:w-[8.5rem] shrink-0 disabled:opacity-60 [color-scheme:light]"
                                    />
                                </div>
                                {(!currentDateBounds.fecini || !currentDateBounds.fecpro) && (
                                    <span className="text-gabu-error text-[9px] 2xl:text-[10px] leading-tight whitespace-nowrap">
                                        {currentDateBounds.source === "parametros"
                                            ? "Sin fecini/fecpro en parámetros."
                                            : "Sin fecini/fecpro en cierres para el período."}
                                    </span>
                                )}
                                {dateRangeError && (
                                    <p className="text-[9px] 2xl:text-[10px] text-gabu-error leading-tight max-w-[18rem]">
                                        {dateRangeError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 2xl:gap-2.5 shrink-0 pl-1">
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md p-1 2xl:p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 text-gabu-100 disabled:opacity-60 disabled:cursor-not-allowed [@media(max-height:600px)]:p-0.5"
                            onClick={collapseAllGroups}
                            disabled={loadingConfig || running || !hasGenerated || renderModel.groupKeys.length === 0}
                            title="Colapsar todos los subtotales"
                            aria-label="Colapsar todos los subtotales"
                        >
                            <CollapseAllIcon style="stroke-current text-gabu-100 h-4 w-4 2xl:h-5 2xl:w-5" onClick={() => undefined} />
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md p-1 2xl:p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 text-gabu-100 disabled:opacity-60 disabled:cursor-not-allowed [@media(max-height:600px)]:p-0.5"
                            onClick={expandAllGroups}
                            disabled={loadingConfig || running || !hasGenerated || renderModel.groupKeys.length === 0}
                            title="Expandir todos los subtotales"
                            aria-label="Expandir todos los subtotales"
                        >
                            <ExpandAllIcon style="stroke-current text-gabu-100 h-4 w-4 2xl:h-5 2xl:w-5" onClick={() => undefined} />
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md p-1 2xl:p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed [@media(max-height:600px)]:p-0.5"
                            onClick={() => void exportToExcel()}
                            disabled={loadingConfig || running || !hasGenerated}
                            title="Exportar a Excel"
                        >
                            <Excel style="fill-current text-gabu-100 h-4 w-4 2xl:h-5 2xl:w-5" onClick={() => undefined} />
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-900 rounded-md h-6 min-h-[1.5rem] px-3 2xl:h-7 2xl:px-5 cursor-pointer hover:bg-gabu-700 transition-colors duration-150 flex items-center text-gabu-100 text-[10px] 2xl:text-xs disabled:opacity-60 disabled:cursor-not-allowed [@media(max-height:600px)]:h-[1.375rem] [@media(max-height:600px)]:px-2.5 [@media(max-height:600px)]:text-[9px]"
                            onClick={() => void runReport()}
                            disabled={
                                loadingConfig ||
                                running ||
                                (needsReportDateRange &&
                                    (!currentDateBounds.fecini || !currentDateBounds.fecpro))
                            }
                        >
                            {running ? "Generando..." : "Generar"}
                        </button>
                    </div>
                </div>
                <div className="relative flex min-h-0 w-full flex-1 flex-col">
                    <div className="relative flex min-h-0 w-full flex-1 flex-col items-stretch">
                    <div
                        ref={tableHorizontalRef}
                        onScroll={syncFromTableScrollbar}
                        className="table-scroll min-h-0 w-full min-w-0 flex-1 overflow-auto rounded-md border border-gabu-900 bg-gabu-100 pb-2 pt-0 2xl:pb-2.5 [@media(max-height:600px)]:pb-1.5"
                    >
                        <div className="table-container grid min-h-0 w-full min-w-0 p-2 2xl:p-3 [@media(max-height:600px)]:p-1.5">
                            {loadingConfig ? (
                                <div className="min-w-full">
                                    <Skeleton count={8} height={16} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1 2xl:mb-1.5" />
                                </div>
                            ) : !hasGenerated ? (
                                <p className="text-gabu-900 text-xs 2xl:text-sm p-3 2xl:p-4">Seleccioná un reporte y presioná Generar.</p>
                            ) : (
                                <table className="min-w-full border-collapse divide-y-2 divide-gabu-900/25 table-auto">
                                        <thead>
                                            <tr>
                                                {showOutlineGutter && (
                                                    <th
                                                        scope="col"
                                                        className="w-8 min-w-[2rem] max-w-[2rem] py-2 px-0.5 2xl:py-2.5 text-center text-gabu-900 [@media(max-height:600px)]:py-1"
                                                        aria-label="Expandir o contraer grupos"
                                                    />
                                                )}
                                                {columns.map((column, columnIndex) => (
                                                    <th
                                                        key={column}
                                                        className={`text-start py-2 px-2.5 2xl:py-2.5 2xl:px-3.5 text-gabu-900 whitespace-nowrap [@media(max-height:600px)]:py-1 [@media(max-height:600px)]:px-2 ${
                                                            columnIndex === 0 ? "pl-3 2xl:pl-4 [@media(max-height:600px)]:pl-2" : ""
                                                        } ${
                                                            columnIndex === columns.length - 1
                                                                ? "pr-3 2xl:pr-4 [@media(max-height:600px)]:pr-2"
                                                                : ""
                                                        }`}
                                                    >
                                                        <p className="text-[10px] leading-snug 2xl:text-sm">
                                                            {displayedReportType === "ANEXO"
                                                                ? getAnexoHeaderLabel(column)
                                                                : displayedReportType === "ASIENTOS"
                                                                  ? getAsientosHeaderLabel(column, asientosBrowLabels)
                                                                  : getDetailHeaderLabel(column)}
                                                        </p>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-gabu-900/25">
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        className="py-2 px-2.5 2xl:py-2.5 2xl:px-3 text-gabu-700 text-[10px] 2xl:text-xs"
                                                        colSpan={(columns.length || 1) + (showOutlineGutter ? 1 : 0)}
                                                    >
                                                        No hay datos para mostrar para los parámetros seleccionados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                renderModel.rows.map((row, index) => {
                                                    const rowMeta = renderModel.meta[index] ?? { kind: "data" as const };
                                                    const isDataHidden =
                                                        rowMeta.kind === "data" &&
                                                        (rowMeta.nestedGroupKeys?.some((k) => collapsedGroups.has(k)) ||
                                                            (!rowMeta.nestedGroupKeys?.length &&
                                                                rowMeta.groupKey != null &&
                                                                collapsedGroups.has(rowMeta.groupKey)));
                                                    if (isDataHidden) return null;
                                                    const isSubtotalHidden =
                                                        rowMeta.kind === "subtotal" &&
                                                        rowMeta.groupKey != null &&
                                                        (() => {
                                                            const key = rowMeta.groupKey;
                                                            const idx = key.indexOf(":");
                                                            if (idx < 0) return false;
                                                            const lvl = Number(key.slice(0, idx));
                                                            const tail = key.slice(idx + 1);
                                                            const parts = tail.split("||");
                                                            if (!Number.isInteger(lvl) || parts.length === 0) return false;
                                                            for (let k = 0; k < lvl; k++) {
                                                                if (collapsedGroups.has(nestedCollapseKey(k, parts.slice(0, k + 1)))) {
                                                                    return true;
                                                                }
                                                            }
                                                            return false;
                                                        })();
                                                    if (isSubtotalHidden) return null;
                                                    const isSummary = rowMeta.kind !== "data" || isSummaryRow(row);
                                                    return (
                                                        <tr key={`row-${index}`} className={isSummary ? "font-semibold" : ""}>
                                                            {showOutlineGutter && (
                                                                <td
                                                                    className="w-8 min-w-[2rem] max-w-[2rem] align-middle py-2 px-0.5 text-center text-gabu-900 [@media(max-height:600px)]:py-1"
                                                                    style={
                                                                        rowMeta.kind === "subtotal" && rowMeta.outlineLevel != null
                                                                            ? { paddingLeft: `${6 + rowMeta.outlineLevel * 8}px` }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {rowMeta.kind === "subtotal" && rowMeta.groupKey != null ? (
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-gabu-900/40 bg-gabu-100 text-xs font-semibold leading-none text-gabu-900 hover:bg-gabu-300"
                                                                            onClick={() => toggleGroupCollapse(rowMeta.groupKey!)}
                                                                            title={
                                                                                collapsedGroups.has(rowMeta.groupKey)
                                                                                    ? "Expandir grupo"
                                                                                    : "Contraer grupo"
                                                                            }
                                                                            aria-expanded={!collapsedGroups.has(rowMeta.groupKey)}
                                                                        >
                                                                            {collapsedGroups.has(rowMeta.groupKey) ? "+" : "−"}
                                                                        </button>
                                                                    ) : null}
                                                                </td>
                                                            )}
                                                            {columns.map((column, columnIndex) => {
                                                                const isNumericCell =
                                                                    !isIdentifierColumn(column) && toNumericValue(row[column]) != null;
                                                                const rawCellText = normalizeCellValue(row[column]);
                                                                const rawLower = rawCellText.toLowerCase();
                                                                const canToggleSubtotal =
                                                                    !showOutlineGutter &&
                                                                    rowMeta.kind === "subtotal" &&
                                                                    rowMeta.groupKey != null &&
                                                                    columnIndex === 0 &&
                                                                    (rawLower.startsWith("subtotal ") ||
                                                                        (rawLower.startsWith("total ") && rawLower !== "total general"));
                                                                if (canToggleSubtotal) {
                                                                    const isCollapsed = collapsedGroups.has(rowMeta.groupKey!);
                                                                    return (
                                                                        <td
                                                                            key={`${index}-${column}`}
                                                                            className={`py-2 px-2.5 2xl:py-2.5 2xl:px-3 text-gabu-900 text-[10px] 2xl:text-xs whitespace-nowrap [@media(max-height:600px)]:py-1 [@media(max-height:600px)]:px-2 ${
                                                                                columnIndex === 0
                                                                                    ? "pl-3 2xl:pl-4 [@media(max-height:600px)]:pl-2"
                                                                                    : ""
                                                                            } ${
                                                                                columnIndex === columns.length - 1
                                                                                    ? "pr-3 2xl:pr-4 [@media(max-height:600px)]:pr-2"
                                                                                    : ""
                                                                            }`}
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="cursor-pointer hover:text-gabu-700 transition-colors duration-100"
                                                                                onClick={() => toggleGroupCollapse(rowMeta.groupKey!)}
                                                                                title={isCollapsed ? "Expandir subtotal" : "Colapsar subtotal"}
                                                                            >
                                                                                {isCollapsed ? "▸" : "▾"} {formatCellValue(row[column], column)}
                                                                            </button>
                                                                        </td>
                                                                    );
                                                                }
                                                                return (
                                                                    <td
                                                                        key={`${index}-${column}`}
                                                                        className={`py-2 px-2.5 2xl:py-2.5 2xl:px-3 text-gabu-900 text-[10px] 2xl:text-xs whitespace-nowrap ${isNumericCell ? "text-right" : ""} [@media(max-height:600px)]:py-1 [@media(max-height:600px)]:px-2 ${
                                                                            columnIndex === 0
                                                                                ? "pl-3 2xl:pl-4 [@media(max-height:600px)]:pl-2"
                                                                                : ""
                                                                        } ${
                                                                            columnIndex === columns.length - 1
                                                                                ? "pr-3 2xl:pr-4 [@media(max-height:600px)]:pr-2"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        {formatCellValue(row[column], column)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
                    {hasGenerated && columns.length > 0 && (
                        <div className="pointer-events-auto absolute bottom-2 left-0 right-0 z-[1] px-2 py-0 2xl:bottom-3 2xl:px-3 [@media(max-height:600px)]:bottom-1.5">
                            <div
                                ref={bottomScrollbarRef}
                                onScroll={syncFromBottomScrollbar}
                                className="no-native-scrollbar table-scroll h-2.5 w-full overflow-x-auto overflow-y-hidden"
                            >
                                <div style={{ width: `${Math.max(tableScrollWidth, 1) + 1}px`, height: "1px" }} />
                            </div>
                        </div>
                    )}
                    <div className="w-full mt-2 2xl:mt-2.5 px-1.5 2xl:px-2 flex items-center justify-between gap-3 [@media(max-height:600px)]:mt-1 [@media(max-height:600px)]:px-1">
                        <p className="text-[10px] 2xl:text-xs text-gabu-700">
                            Reporte seleccionado: {selectedReportLabel}
                        </p>
                        <p className="text-[10px] 2xl:text-xs text-gabu-700">
                            Registros: {rows.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
