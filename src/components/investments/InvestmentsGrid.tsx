'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useFetch } from "@/hooks/useFetch";
import { ConverFieldModel } from "@/generated/prisma/models";
import { InvestmentType, InvestmentsData } from "@/lib/models/investments/Investments";
import {
    createColumnHelper,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingFnOption,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { DndContext, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import DraggableCell from "@/components/tables/DraggableCell";
import DraggableHeader from "@/components/tables/DraggableHeader";
import Search from "@/components/svg/Search";
import Reload from "@/components/svg/Reload";
import Excel from "@/components/svg/Excel";
import Arrow from "@/components/svg/Arrow";
import Checked from "@/components/svg/Checked";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ExcelJS from "exceljs";
import { getColumnType, type ColumnFilterValue } from "@/components/fixedAssets/ColumnFilter";

type RowData = Record<string, unknown>;

const PAGE_SIZE_OPTIONS = [
    { key: "5", value: "5" },
    { key: "10", value: "10" },
] as const;

const COMPACT_PAGE_MEDIA = "(max-width: 1180px), (max-height: 680px)";

function readViewportCompact(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(COMPACT_PAGE_MEDIA).matches;
}

function normalizeKey(key: string): string {
    return key.trim().toLowerCase();
}

function getRowValueByField(row: RowData, fieldId: string): unknown {
    if (fieldId in row) return row[fieldId];
    const normalized = normalizeKey(fieldId);
    const match = Object.keys(row).find((k) => normalizeKey(k) === normalized);
    return match ? row[match] : undefined;
}

function isDecimalLikeObject(value: unknown): value is { s: number; e: number; d: number[] } {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
    return typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d);
}

function decimalLikeToString(value: { s: number; e: number; d: number[] }): string {
    if (value.d.length === 0) return "0";
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

    text = text.replace(/\.?0+$/, "");
    if (!text) text = "0";
    return value.s < 0 ? `-${text}` : text;
}

function normalizeCellValue(value: unknown): string | number {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (isDecimalLikeObject(value)) return decimalLikeToString(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export default function InvestmentsGrid({ type }: { type: InvestmentType }): React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const options: RequestInit = useMemo(
        () => ({
            method: "POST",
            body: JSON.stringify({
                petition: "Get",
                client,
                data: { type },
            }),
            headers: { "Content-Type": "application/json" },
        }),
        [client, type]
    );

    const { data, loading, refetch } = useFetch<InvestmentsData>("/api/investments", options);
    const [rows, setRows] = useState<RowData[]>([]);
    const [fields, setFields] = useState<ConverFieldModel[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
    const [sorting, setSorting] = useState<SortingState>([]);
    const [viewportCompact, setViewportCompact] = useState(() => readViewportCompact());
    const [pagination, setPagination] = useState(() => ({
        pageIndex: 0,
        pageSize: 10,
    }));
    const [columnFilterColumnId, setColumnFilterColumnId] = useState<string | null>(null);
    const [closingColumnId, setClosingColumnId] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterValue>>({});
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [searchValue, setSearchValue] = useState("");
    const [isEntriesSelectOpen, setIsEntriesSelectOpen] = useState(false);
    const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia(COMPACT_PAGE_MEDIA);
        const sync = () => setViewportCompact(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    useEffect(() => {
        const rawTable = data?.table ?? [];
        const fm = data?.fieldsManage ?? [];
        setFields(fm);
        if (type === "charges") {
            setRows(
                rawTable.map((row, i) => {
                    const r = row as RowData;
                    const rid =
                        getRowValueByField(r, "id") ??
                        getRowValueByField(r, "idcargo") ??
                        getRowValueByField(r, "IdCargo") ??
                        getRowValueByField(r, "ID_CARGO") ??
                        getRowValueByField(r, "idCargo");
                    const base = rid != null && String(rid).trim() !== "" ? String(rid).trim() : `r${i}`;
                    return { ...r, __chargeRowId: `${base}::${i}` };
                })
            );
        } else {
            setRows(rawTable as RowData[]);
        }
    }, [data, type]);

    useEffect(() => {
        setSelectedChargeIds(new Set());
    }, [data, type]);

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [type]);

    useEffect(() => {
        setPagination((p) => (p.pageSize === 15 ? { ...p, pageIndex: 0, pageSize: 10 } : p));
    }, []);

    useEffect(() => {
        if (fields.length === 0) return;
        const sorted = [...fields].sort((a, b) => (a.lisordencampos ?? 0) - (b.lisordencampos ?? 0));
        const fieldIds = sorted.map((f) => f.IdCampo);
        setColumnOrder((prev) => {
            if (type === "charges") {
                if (prev.length === 0) return ["seleccionar", ...fieldIds];
                const tail = (prev[0] === "seleccionar" ? prev.slice(1) : prev.filter((id) => id !== "seleccionar")).filter((id) =>
                    fieldIds.includes(id)
                );
                const missing = fieldIds.filter((id) => !tail.includes(id));
                return ["seleccionar", ...tail, ...missing];
            }
            return prev.length === 0 ? fieldIds : prev.filter((id) => fieldIds.includes(id));
        });
        setColumnVisibility(() => {
            const fromFields = Object.fromEntries(sorted.map((f) => [f.IdCampo, f.listShow]));
            if (type === "charges") return { seleccionar: true, ...fromFields };
            return fromFields;
        });
    }, [fields, type]);

    useEffect(
        () => () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        },
        []
    );

    const columnHelper = createColumnHelper<RowData>();

    const toggleChargeSelect = useCallback((rowId: string) => {
        setSelectedChargeIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) next.delete(rowId);
            else next.add(rowId);
            return next;
        });
    }, []);

    const columns = useMemo(() => {
        const fieldCols = fields.map((field) =>
            columnHelper.accessor((row) => getRowValueByField(row, field.IdCampo), {
                id: field.IdCampo,
                size: 220,
                header: field.BrowNombre ?? field.IdCampo,
                cell: (info) => normalizeCellValue(info.getValue()),
                sortingFn: "myCustomSorting" as SortingFnOption<RowData>,
            })
        );
        if (type !== "charges") return fieldCols;
        const selectCol = columnHelper.display({
            id: "seleccionar",
            size: 100,
            enableSorting: false,
            header: "Seleccionar",
            cell: ({ row }) => {
                const id = String((row.original as RowData).__chargeRowId ?? "");
                return (
                    <div className="relative flex w-full min-w-[40px] items-center justify-center py-1">
                        <input
                            type="checkbox"
                            aria-label="Seleccionar fila"
                            className="peer h-4 w-4 min-h-[16px] min-w-[16px] cursor-pointer appearance-none rounded-md border border-gabu-900 bg-gabu-300 checked:bg-gabu-900 focus:outline-none"
                            checked={selectedChargeIds.has(id)}
                            onChange={() => toggleChargeSelect(id)}
                        />
                        <Checked style="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 min-h-[16px] min-w-[16px] -translate-x-1/2 -translate-y-1/2 text-gabu-100 opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                );
            },
        });
        return [selectCol, ...fieldCols];
    }, [fields, columnHelper, type, selectedChargeIds, toggleChargeSelect]);

    const visibleColumnIds = useMemo(() => fields.filter((f) => columnVisibility[f.IdCampo] !== false).map((f) => f.IdCampo), [fields, columnVisibility]);

    const rowPassesColumnFilters = useCallback(
        (row: RowData): boolean => {
            for (const [columnId, filter] of Object.entries(columnFilters)) {
                const raw = getRowValueByField(row, columnId);
                const strVal = String(normalizeCellValue(raw)).trim();
                if (filter.type === "number") {
                    const num = strVal !== "" && !isNaN(Number(strVal)) ? Number(strVal) : null;
                    const f = Number(filter.value);
                    if (num == null || isNaN(f)) return false;
                    if (filter.condition === "gt" && !(num > f)) return false;
                    if (filter.condition === "lt" && !(num < f)) return false;
                    if (filter.condition === "gte" && !(num >= f)) return false;
                    if (filter.condition === "lte" && !(num <= f)) return false;
                    if (filter.condition === "eq" && !(num === f)) return false;
                } else if (filter.type === "string") {
                    const v = (filter.value ?? "").toLowerCase();
                    const s = strVal.toLowerCase();
                    if (filter.condition === "contains" && !s.includes(v)) return false;
                    if (filter.condition === "equals" && s !== v) return false;
                    if (filter.condition === "startsWith" && !s.startsWith(v)) return false;
                    if (filter.condition === "endsWith" && !s.endsWith(v)) return false;
                } else {
                    const d = strVal ? Date.parse(strVal) : NaN;
                    const desde = filter.desde ? Date.parse(filter.desde) : NaN;
                    const hasta = filter.hasta ? Date.parse(filter.hasta) : NaN;
                    if (!isNaN(desde) && (isNaN(d) || d < desde)) return false;
                    if (!isNaN(hasta) && (isNaN(d) || d > hasta)) return false;
                }
            }
            return true;
        },
        [columnFilters]
    );

    const filteredRows = useMemo(() => {
        let base = rows;
        if (searchValue.trim()) {
            const s = searchValue.toLowerCase();
            base = base.filter((row) =>
                fields.some((f) => {
                    const v = getRowValueByField(row, f.IdCampo);
                    return v != null && String(normalizeCellValue(v)).toLowerCase().includes(s);
                })
            );
        }
        if (Object.keys(columnFilters).length > 0) {
            base = base.filter((row) => rowPassesColumnFilters(row));
        }
        return base;
    }, [rows, searchValue, fields, columnFilters, rowPassesColumnFilters]);

    const table = useReactTable({
        data: filteredRows,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onColumnOrderChange: setColumnOrder,
        onColumnVisibilityChange: setColumnVisibility,
        state: { pagination, sorting, columnOrder, columnVisibility },
        columnResizeMode: "onChange",
        sortingFns: {
            myCustomSorting: (rowA, rowB, columnId) => {
                const aRaw = normalizeCellValue(rowA.getValue(columnId));
                const bRaw = normalizeCellValue(rowB.getValue(columnId));
                if (aRaw == null && bRaw == null) return 0;
                if (aRaw == null) return -1;
                if (bRaw == null) return 1;
                const a = String(aRaw).toLowerCase().trim();
                const b = String(bRaw).toLowerCase().trim();
                if (!isNaN(Number(a)) && !isNaN(Number(b))) return Number(a) - Number(b);
                const ad = Date.parse(a);
                const bd = Date.parse(b);
                if (!isNaN(ad) && !isNaN(bd)) return ad - bd;
                return a.localeCompare(b);
            },
        },
    });

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;
        if (type === "charges" && (active.id === "seleccionar" || over.id === "seleccionar")) return;

        if (type === "charges") {
            const orderFields = columnOrder.filter((id) => id !== "seleccionar");
            const oldIndex = orderFields.indexOf(active.id as string);
            const newIndex = orderFields.indexOf(over.id as string);
            if (oldIndex < 0 || newIndex < 0) return;
            const moved = arrayMove(orderFields, oldIndex, newIndex);
            const newOrder = ["seleccionar", ...moved];
            setColumnOrder(newOrder);
            await fetch("/api/investments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "UpdateOrder",
                    client,
                    data: {
                        type,
                        order: moved.map((id, index) => ({ tableId: fields[0]?.IdTabla ?? "", fieldId: id, order: index })),
                    },
                }),
            });
            return;
        }

        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);
        const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
        setColumnOrder(newOrder);
        await fetch("/api/investments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                petition: "UpdateOrder",
                client,
                data: {
                    type,
                    order: newOrder.map((id, index) => ({ tableId: fields[0]?.IdTabla ?? "", fieldId: id, order: index })),
                },
            }),
        });
    };

    const handleEntriesSelect = (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
        const li = e.currentTarget;
        const key = li.dataset.key;
        const value = li.textContent?.trim() ?? "";
        if (!key || !ref.current) return;
        const next = Number(key);
        if (![5, 10].includes(next)) return;
        ref.current.textContent = value;
        ref.current.dataset.key = key;
        setPagination({ pageIndex: 0, pageSize: next });
    };

    const handleSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setSearchValue(value), 300);
    };

    function getPaginationItems() {
        const totalPages = table.getPageCount();
        const currentPage = table.getState().pagination.pageIndex + 1;
        const items: (number | "...")[] = [];
        const siblingCount = 2;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) items.push(i);
        } else {
            const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
            const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

            const showLeftDots = leftSiblingIndex > 2;
            const showRightDots = rightSiblingIndex < totalPages - 1;

            if (!showLeftDots && showRightDots) {
                const leftRange = Array.from({ length: 6 }, (_, i) => i + 1);
                items.push(...leftRange, "...", totalPages);
            } else if (showLeftDots && !showRightDots) {
                const rightRange = Array.from({ length: 6 }, (_, i) => totalPages - 6 + i + 1);
                items.push(1, "...", ...rightRange);
            } else {
                const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
                items.push(1, "...", ...middleRange, "...", totalPages);
            }
        }

        return items.map((page, index) => {
            if (page === "...") {
                return (
                    <span key={`dots-${index}`} className="text-gabu-700 text-xs px-1 xl:px-2">
                        ...
                    </span>
                );
            }

            const isActive = page === currentPage;

            return (
                <span
                    key={page}
                    className={`${
                        isActive
                            ? "text-gabu-900 font-bold bg-gabu-200 text-xs xl:text-sm"
                            : "text-gabu-700 text-xs hover:bg-gabu-300 transition-colors duration-150"
                    } cursor-pointer p-1.5 xl:p-2 rounded-2xl min-w-[28px] xl:min-w-[32px] text-center`}
                    onClick={() => table.setPageIndex(Number(page) - 1)}
                >
                    {page}
                </span>
            );
        });
    }

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Data");
        const visibleColumns = table.getVisibleFlatColumns().filter((col) => col.id !== "seleccionar");
        worksheet.columns = visibleColumns.map((col) => ({
            header: col.columnDef.header as string,
            key: col.id,
            width: 20,
        }));
        const exportRows = table.getPrePaginationRowModel().rows;
        exportRows.forEach((row) => {
            const rowData: Record<string, unknown> = {};
            visibleColumns.forEach((col) => {
                rowData[col.id] = normalizeCellValue(row.getValue(col.id));
            });
            worksheet.addRow(rowData);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fields[0]?.IdTabla || "Inversiones"}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
            <div className="main-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-3 pb-2 pr-2 sm:p-5 sm:pb-3 sm:pr-3 lg:p-8 lg:pb-4 lg:pr-4 [@media(max-height:600px)]:p-2 [@media(max-height:600px)]:pb-1.5 [@media(max-height:600px)]:pr-1.5">
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gabu-900 bg-gabu-500 p-2 sm:p-4 lg:p-5 [@media(max-height:600px)]:p-1.5">
                    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border border-gabu-900 bg-gabu-100 p-2 sm:p-3 [@media(max-height:600px)]:p-1.5">
                    <div className="relative z-30 mb-1.5 flex w-full shrink-0 flex-col gap-2 sm:mb-2 sm:flex-row sm:items-stretch sm:justify-between [@media(max-height:600px)]:mb-1 [@media(max-height:600px)]:gap-1.5">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 [@media(max-height:600px)]:gap-1.5">
                            <div className="flex h-8 min-h-8 min-w-0 flex-1 basis-[min(100%,11rem)] max-w-[15rem] shrink-0 items-center gap-1 rounded-md bg-gabu-500 px-2 py-0 sm:max-w-[15rem] sm:basis-[15rem] sm:gap-1.5 sm:px-2.5 [@media(max-height:600px)]:max-w-[12rem] [@media(max-height:600px)]:px-2">
                                <Search style="!h-3 !w-3 shrink-0 stroke-gabu-100 sm:!h-3.5 sm:!w-3.5" />
                                <input ref={searchInputRef} type="text" placeholder="Buscar..." className="focus:outline-none text-gabu-100 min-w-0 w-full flex items-center text-sm" onInput={handleSearchInput} />
                            </div>
                            <div
                                className={`flex h-8 min-h-8 shrink-0 items-center gap-1 rounded-md bg-gabu-500 pl-1 pr-1.5 sm:gap-2 sm:pl-1.5 sm:pr-2 [@media(max-height:600px)]:gap-1 [@media(max-height:600px)]:pl-1 [@media(max-height:600px)]:pr-1 ${isEntriesSelectOpen ? "rounded-b-none rounded-t-md" : ""}`}
                                id="inv-select-entries-cont"
                            >
                                <div className="flex h-full min-h-0 min-w-0 max-w-[5.5rem] shrink-0 items-stretch sm:max-w-[6rem]">
                                    <Select
                                        key={`inv-entries-${type}`}
                                        label=""
                                        hasLabel={false}
                                        isLogin={false}
                                        variant="entriesPerPage"
                                        options={[...PAGE_SIZE_OPTIONS]}
                                        defaultValue={String(pagination.pageSize)}
                                        chooseOptionHandler={handleEntriesSelect}
                                        onListOpenChange={setIsEntriesSelectOpen}
                                        entriesToolbarTone="gabu-500"
                                        entriesUseFixedDropdown
                                        controlClassName="!h-full min-h-0 !py-0 pl-1.5 pr-1 sm:pl-2 sm:pr-1.5"
                                    />
                                </div>
                                <p className="whitespace-nowrap text-sm text-gabu-100 [@media(max-height:600px)]:text-[11px]">Entradas por pagina</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 [@media(max-height:600px)]:gap-1">
                            <button type="button" className="rounded-md bg-gabu-500 p-1.5 cursor-pointer transition-colors duration-100 hover:bg-gabu-300 sm:p-2 flex items-center justify-center [@media(max-height:600px)]:p-1" onClick={() => void refetch()}>
                                <Reload style="!h-4 !w-4 shrink-0 fill-current text-gabu-100 sm:!h-[18px] sm:!w-[18px]" />
                            </button>
                            <button type="button" className="rounded-md bg-gabu-500 p-1.5 cursor-pointer transition-colors duration-100 hover:bg-gabu-300 sm:p-2 flex items-center justify-center [@media(max-height:600px)]:p-1" onClick={() => void exportToExcel()}>
                                <Excel style="fill-current text-gabu-100 !h-4 !w-4 shrink-0 sm:!h-[18px] sm:!w-[18px]" onClick={() => undefined} />
                            </button>
                        </div>
                    </div>
                    <div
                        className={`table-container w-full min-w-0 min-h-0 overflow-auto ${
                            type === "charges" ? "flex-1" : "h-fit max-h-[min(65vh,36rem)] shrink-0"
                        }`}
                    >
                        <div className="min-w-full">
                            {loading ? (
                                <Skeleton
                                    count={viewportCompact ? 4 : 6}
                                    height={viewportCompact ? 16 : 20}
                                    highlightColor="var(--color-gabu-700)"
                                    baseColor="var(--color-gabu-300)"
                                    className="mb-1"
                                />
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
                                    <table className="border-collapse divide-y-2 divide-gabu-900/25 table-fixed w-full" {...{ style: { minWidth: table.getTotalSize() } }}>
                                        <thead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id}>
                                                    <SortableContext key={headerGroup.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                                                        {headerGroup.headers.map((header) => {
                                                            const sampleValue =
                                                                header.id === "seleccionar"
                                                                    ? null
                                                                    : filteredRows.length > 0
                                                                      ? getRowValueByField(filteredRows[0], header.id)
                                                                      : null;
                                                            const filterColumnType =
                                                                header.id === "seleccionar" ? undefined : getColumnType(header.id, sampleValue);
                                                            return (
                                                                <DraggableHeader
                                                                    key={header.id}
                                                                    header={header}
                                                                    onOpenColumnFilter={(columnId) => {
                                                                        setColumnFilterColumnId((prev) => (prev === columnId ? null : columnId));
                                                                        setClosingColumnId(null);
                                                                    }}
                                                                    isFilterOpen={columnFilterColumnId === header.id}
                                                                    isClosingColumnId={closingColumnId}
                                                                    onCloseColumnFilter={() => {
                                                                        if (columnFilterColumnId) {
                                                                            setClosingColumnId(columnFilterColumnId);
                                                                            setTimeout(() => {
                                                                                setColumnFilterColumnId(null);
                                                                                setClosingColumnId(null);
                                                                            }, 260);
                                                                        }
                                                                    }}
                                                                    onApplyColumnFilter={(columnId, value) => {
                                                                        setColumnFilters((prev) => ({ ...prev, [columnId]: value }));
                                                                        setClosingColumnId(columnId);
                                                                        setTimeout(() => {
                                                                            setColumnFilterColumnId(null);
                                                                            setClosingColumnId(null);
                                                                        }, 260);
                                                                    }}
                                                                    columnType={filterColumnType}
                                                                    columnFilterValue={columnFilters[header.id] ?? null}
                                                                />
                                                            );
                                                        })}
                                                    </SortableContext>
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody className="divide-y-2 divide-gabu-900/25 relative">
                                            {table.getRowModel().rows.map((row) => (
                                                <tr key={row.id}>
                                                    <SortableContext key={row.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                                                        {row.getVisibleCells().map((cell, index) => (
                                                            <DraggableCell key={cell.id} cell={cell} index={index} />
                                                        ))}
                                                    </SortableContext>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </DndContext>
                            )}
                        </div>
                    </div>
                    {table.getCanNextPage() || table.getCanPreviousPage() ? (
                        <div className="mt-1 flex shrink-0 justify-center pt-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mt-1">
                            <nav className="flex gap-1 xl:gap-2 items-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                                <span
                                    className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-1.5 xl:p-2 rounded-2xl inline-flex items-center justify-center [&_svg]:scale-90 xl:[&_svg]:scale-100 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1"
                                    onClick={() => table.getCanPreviousPage() && table.previousPage()}
                                >
                                    <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-180" activeRotation="rotate-180" active={false} />
                                </span>
                                {getPaginationItems()}
                                <span
                                    className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-1.5 xl:p-2 rounded-2xl inline-flex items-center justify-center [&_svg]:scale-90 xl:[&_svg]:scale-100 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1"
                                    onClick={() => table.getCanNextPage() && table.nextPage()}
                                >
                                    <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-0" activeRotation="rotate-0" active={false} />
                                </span>
                            </nav>
                        </div>
                    ) : null}
                    </div>
                </div>
            </div>
            {type === "charges" ? (
                <div className="sticky bottom-0 z-10 flex w-full shrink-0 items-center justify-end gap-2 border-t border-gabu-900/40 bg-gabu-500 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2 lg:gap-5 [@media(max-height:600px)]:px-2 [@media(max-height:600px)]:py-1">
                    <Button
                        text="Transferir"
                        type="button"
                        disabled={selectedChargeIds.size === 0}
                        handleClick={() => {
                            /* Integración API transferencia de cargos */
                        }}
                        style="font-normal text-gabu-900 w-auto min-w-[5.25rem] max-w-[10rem] shrink-0 rounded-md border border-gabu-900/30 bg-gabu-100 px-3 py-1 text-xs transition-colors duration-300 hover:bg-gabu-300 sm:min-w-[6.5rem] sm:px-4 sm:py-1.5 sm:text-sm"
                    />
                </div>
            ) : null}
        </div>
    );
}
