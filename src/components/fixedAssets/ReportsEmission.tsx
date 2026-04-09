'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Alert from "@/components/ui/Alert";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import type { ReportType } from "@/lib/models/reports/Reports";
import Select from "@/components/ui/Select";
import Excel from "@/components/svg/Excel";
import ExcelJS from "exceljs";

type ReportBookOption = {
    key: string;
    value: string;
    tableName: string;
};

type ReportsConfigResponse = {
    books: ReportBookOption[];
    defaultPeriod: string;
    periods: string[];
};

const REPORTS: { key: ReportType; label: string }[] = [
    { key: "ANEXO", label: "Anexo" },
    { key: "DETALLE_ACTIVO", label: "Detalle activo" },
    { key: "ALTAS_ACTIVO", label: "Altas activo" },
    { key: "BAJAS_ACTIVO", label: "Bajas activo" },
    { key: "TRANSFERENCIAS_ACTIVO", label: "Transferencias activo" },
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

function normalizeCellValue(value: unknown): string {
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
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
        normalized === "codigo" ||
        normalized === "clase" ||
        normalized === "cantidad"
    );
}

function formatCellValue(value: unknown, column: string): string {
    const raw = normalizeCellValue(value);
    if (raw === "") return raw;
    if (isIdentifierColumn(column)) return raw;
    const numeric = toNumericValue(value);
    if (numeric == null) return raw;
    return numeric.toFixed(2);
}

function formatPeriodToMMYYYY(period: string): string {
    if (!/^\d{6}$/.test(period)) return period;
    return `${period.slice(4, 6)}/${period.slice(0, 4)}`;
}

function isSummaryCell(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("subtotal ") || normalized === "total general";
}

function isSummaryRow(row: Record<string, unknown>): boolean {
    return Object.values(row).some((value) => isSummaryCell(value));
}

type RenderRowMeta = {
    kind: "data" | "subtotal" | "total";
    groupKey?: string;
};

type RenderModel = {
    rows: Record<string, unknown>[];
    meta: RenderRowMeta[];
    groupKeys: string[];
};

export default function ReportsEmission(): React.ReactElement {
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
                let currentGroupKey = "";
                let currentGroupValues: string[] = [];
                let subtotalSumByColumn: Record<string, number> = {};
                let subtotalHasNumericByColumn: Record<string, boolean> = {};

                const resetSubtotal = () => {
                    subtotalSumByColumn = {};
                    subtotalHasNumericByColumn = {};
                    for (const column of detailTotalColumns) {
                        subtotalSumByColumn[column] = 0;
                        subtotalHasNumericByColumn[column] = false;
                    }
                };

                const buildGroupValues = (row: Record<string, unknown>): string[] =>
                    subtotalGroupColumns.map((column) => normalizeCellValue(row[column]));

                const pushSubtotalRow = () => {
                    if (!currentGroupKey) return;
                    const subtotalRow: Record<string, unknown> = {};
                    for (const column of columns) {
                        if (column === subtotalGroupColumns[0]) {
                            subtotalRow[column] = `Subtotal ${currentGroupValues.join(" - ")}`;
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
                        subtotalRow[column] = subtotalHasNumericByColumn[column] ? subtotalSumByColumn[column] : "";
                    }
                    renderedRows.push(subtotalRow);
                    renderedMeta.push({ kind: "subtotal", groupKey: currentGroupKey });
                    groupKeysSet.add(currentGroupKey);
                };

                resetSubtotal();
                for (const row of rows) {
                    const groupValues = buildGroupValues(row);
                    const nextGroupKey = groupValues.join("||");
                    if (currentGroupKey === "") {
                        currentGroupKey = nextGroupKey;
                        currentGroupValues = groupValues;
                    } else if (nextGroupKey !== currentGroupKey) {
                        pushSubtotalRow();
                        currentGroupKey = nextGroupKey;
                        currentGroupValues = groupValues;
                        resetSubtotal();
                    }

                    renderedRows.push(row);
                    renderedMeta.push({ kind: "data", groupKey: currentGroupKey });

                    for (const column of detailTotalColumns) {
                        const numeric = toNumericValue(row[column]);
                        if (numeric == null) continue;
                        subtotalSumByColumn[column] += numeric;
                        subtotalHasNumericByColumn[column] = true;
                    }
                }
                pushSubtotalRow();
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
                meta: [...renderedMeta, { kind: "total" }],
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
    const selectedReportLabel = useMemo(
        () => REPORTS.find((report) => report.key === displayedReportType)?.label ?? "Reporte",
        [displayedReportType]
    );
    const bookOptions = useMemo(
        () => books.map((book) => ({ key: book.key, value: book.value })),
        [books]
    );
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
                        data: {},
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
    }, [client]);

    const runReport = useCallback(async () => {
        if (!client || running) return;
        if (!selectedBook) {
            setErrorMessage("Debe seleccionar un libro");
            setShowErrorAlert(true);
            return;
        }
        if (!isValidYYYYMM(period)) {
            setPeriodError("El período debe tener formato YYYYMM");
            return;
        }
        setPeriodError(null);
        setRunning(true);
        setHasGenerated(false);
        setErrorMessage(null);
        setSuccessMessage(null);
        setShowErrorAlert(false);
        setShowSuccessAlert(false);
        setCollapsedGroups(new Set());
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Generate",
                    client,
                    data: {
                        reportType,
                        book: selectedBook.key,
                        bookTableName: selectedBook.tableName,
                        period,
                    },
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
            setSuccessMessage(`${REPORTS.find((r) => r.key === reportType)?.label ?? "Reporte"} generado correctamente`);
            setShowSuccessAlert(true);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : String(err));
            setShowErrorAlert(true);
        } finally {
            setRunning(false);
        }
    }, [client, period, reportType, running, selectedBook]);

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
            displayedReportType === "ANEXO" ? getAnexoHeaderLabel(column) : getDetailHeaderLabel(column)
        );
        const colCount = Math.max(headers.length, 1);
        const periodLabel = formatPeriodToMMYYYY(period);
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

        sourceRows.forEach((row) => {
            const excelRow = worksheet.addRow(columns.map((column) => formatCellValue(row[column], column)));
            columns.forEach((column, index) => {
                const numeric = toNumericValue(row[column]);
                if (numeric == null || isIdentifierColumn(column)) return;
                const cell = excelRow.getCell(index + 1);
                cell.alignment = { ...(cell.alignment ?? {}), horizontal: "right" };
            });
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
    }, [columns, displayedReportType, hasGenerated, period, renderModel.rows, rows, selectedBook?.value, selectedReportLabel]);

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
            <div className="w-full h-full p-3 xl:p-4 pb-3 flex flex-col gap-1.5">
                <div className="bg-gabu-500 rounded-md border border-gabu-900 px-3 py-1.5 xl:px-4 xl:py-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-gabu-100 text-sm xl:text-base">Emision de reportes</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {REPORTS.map((report) => (
                            <button
                                key={report.key}
                                type="button"
                                onClick={() => setReportType(report.key)}
                                className={`h-7 px-3 rounded-md transition-colors duration-150 cursor-pointer text-xs border disabled:opacity-60 disabled:cursor-not-allowed ${
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

                <div className="bg-gabu-500 rounded-md border border-gabu-900 px-3 py-1.5 xl:px-4 xl:py-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-start gap-3 xl:gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-gabu-100 text-xs xl:text-sm whitespace-nowrap">Libro</label>
                            <div className="min-w-[11.5rem] xl:min-w-[13rem]">
                                <Select
                                    label="Libro"
                                    hasLabel={false}
                                    isLogin={false}
                                    variant="abm"
                                    options={bookOptions}
                                    defaultValue={selectedBookKey}
                                    chooseOptionHandler={handleBookSelect}
                                    controlClassName={loadingConfig || running ? "bg-gabu-300 pointer-events-none" : ""}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <label className="text-gabu-100 text-xs xl:text-sm whitespace-nowrap">Periodo (YYYYMM)</label>
                                <div className="w-[7.5rem]">
                                    <Select
                                        label="Periodo"
                                        hasLabel={false}
                                        isLogin={false}
                                        variant="abm"
                                        options={periodOptions}
                                        defaultValue={period}
                                        chooseOptionHandler={handlePeriodSelect}
                                        controlClassName={loadingConfig || running ? "bg-gabu-300 pointer-events-none" : ""}
                                    />
                                </div>
                            </div>
                            {periodError && <p className="text-xs text-gabu-error">{periodError}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-gabu-100 text-xs xl:text-sm whitespace-nowrap">Subtotales</label>
                            <div className="w-[4.5rem]">
                                <Select
                                    label="Subtotales por columna"
                                    hasLabel={false}
                                    isLogin={false}
                                    variant="abm"
                                    options={subtotalOptions}
                                    defaultValue={subtotalColumns}
                                    chooseOptionHandler={handleSubtotalSelect}
                                    controlClassName={loadingConfig || running ? "bg-gabu-300 pointer-events-none" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md h-7 px-3 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 text-gabu-100 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={collapseAllGroups}
                            disabled={loadingConfig || running || !hasGenerated || renderModel.groupKeys.length === 0}
                            title="Colapsar todos los subtotales"
                        >
                            Colapsar todo
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md h-7 px-3 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 text-gabu-100 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={expandAllGroups}
                            disabled={loadingConfig || running || !hasGenerated || renderModel.groupKeys.length === 0}
                            title="Expandir todos los subtotales"
                        >
                            Expandir todo
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-700 rounded-md p-1 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => void exportToExcel()}
                            disabled={loadingConfig || running || !hasGenerated}
                            title="Exportar a Excel"
                        >
                            <Excel style="fill-current text-gabu-100 h-[20px] w-[20px]" />
                        </button>
                        <button
                            type="button"
                            className="bg-gabu-900 rounded-md h-7 px-3 xl:px-4 cursor-pointer hover:bg-gabu-700 transition-colors duration-150 flex items-center text-gabu-100 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => void runReport()}
                            disabled={loadingConfig || running}
                        >
                            {running ? "Generando..." : "Generar"}
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 w-full flex items-center flex-col relative">
                    <div className="relative w-full max-h-[95%] flex flex-col items-center flex-1 min-w-0">
                    <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden table-scroll bg-gabu-100 border border-gabu-900 rounded-md pb-8">
                        <div className="w-full overflow-y-auto overflow-x-hidden table-container grid p-2">
                            {loadingConfig ? (
                                <div className="min-w-full">
                                    <Skeleton count={8} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1" />
                                </div>
                            ) : !hasGenerated ? (
                                <p className="text-gabu-900 text-sm p-2">Seleccioná un reporte y presioná Generar.</p>
                            ) : (
                                <div
                                    ref={tableHorizontalRef}
                                    onScroll={syncFromTableScrollbar}
                                    className="w-full max-w-full overflow-x-auto no-native-scrollbar"
                                >
                                    <table className="border-collapse divide-y-2 divide-gabu-900/25 table-auto min-w-full">
                                        <thead>
                                            <tr>
                                                {columns.map((column) => (
                                                    <th key={column} className="text-start py-2 px-3 text-gabu-900 whitespace-nowrap">
                                                        <p className="text-xs xl:text-sm">
                                                            {displayedReportType === "ANEXO" ? getAnexoHeaderLabel(column) : getDetailHeaderLabel(column)}
                                                        </p>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-gabu-900/25">
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td className="py-2 px-2 text-gabu-700 text-xs" colSpan={columns.length || 1}>
                                                        No hay datos para mostrar para los parámetros seleccionados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                renderModel.rows.map((row, index) => {
                                                    const rowMeta = renderModel.meta[index] ?? { kind: "data" as const };
                                                    const isDataHidden =
                                                        rowMeta.kind === "data" &&
                                                        !!rowMeta.groupKey &&
                                                        collapsedGroups.has(rowMeta.groupKey);
                                                    if (isDataHidden) return null;
                                                    const isSummary = rowMeta.kind !== "data" || isSummaryRow(row);
                                                    return (
                                                        <tr key={`row-${index}`} className={isSummary ? "font-semibold" : ""}>
                                                            {columns.map((column, columnIndex) => {
                                                                const isNumericCell =
                                                                    !isIdentifierColumn(column) && toNumericValue(row[column]) != null;
                                                                const rawCellText = normalizeCellValue(row[column]);
                                                                const canToggleSubtotal =
                                                                    rowMeta.kind === "subtotal" &&
                                                                    rowMeta.groupKey != null &&
                                                                    columnIndex === 0 &&
                                                                    rawCellText.toLowerCase().startsWith("subtotal ");
                                                                if (canToggleSubtotal) {
                                                                    const isCollapsed = collapsedGroups.has(rowMeta.groupKey!);
                                                                    return (
                                                                        <td key={`${index}-${column}`} className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap">
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
                                                                        className={`py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ${isNumericCell ? "text-right" : ""}`}
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                    {hasGenerated && columns.length > 0 && (
                        <div className="absolute bottom-5 2xl:bottom-7 left-0 right-0 px-2 py-1">
                            <div
                                ref={bottomScrollbarRef}
                                onScroll={syncFromBottomScrollbar}
                                className="w-full overflow-x-scroll overflow-y-hidden table-scroll"
                            >
                                <div style={{ width: `${Math.max(tableScrollWidth, 1) + 1}px`, height: "1px" }} />
                            </div>
                        </div>
                    )}
                    <div className="w-full mt-1.5 px-1 flex items-center justify-between">
                        <p className="text-[11px] xl:text-xs text-gabu-700">
                            Reporte seleccionado: {selectedReportLabel}
                        </p>
                        <p className="text-[11px] xl:text-xs text-gabu-700">
                            Registros: {rows.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
