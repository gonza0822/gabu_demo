'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { navActions } from "@/store/navSlice";
import { openPagesActions } from "@/store/openPagesSlice";
import { Menu } from "@/store/navSlice";
import { FixedAssetsData, FixedAssets } from "@/lib/models/fixedAssets/FixedAsset";
import { useFetch } from "@/hooks/useFetch";
import { createColumnHelper, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingFnOption, SortingState } from "@tanstack/react-table";
import { DndContext, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import DraggableCell from "../tables/DraggableCell";
import DraggableHeader from "../tables/DraggableHeader";
import Arrow from "../svg/Arrow";
import Actions from "../svg/Actions";
import Alert from "../ui/Alert";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import Search from "../svg/Search";
import Reload from "../svg/Reload";
import Filter from "../svg/Filter";
import RemoveFilter from "../svg/RemoveFilter";
import Select from "../ui/Select";
import ExcelJS from "exceljs";
import Excel from "../svg/Excel";
import FilterModal, { FilterValues } from "./FilterModal";
import BajaModal from "./BajaModal";
import TransferModal from "./TransferModal";
import BajaFisicaModal from "./BajaFisicaModal";
import { getColumnType, type ColumnFilterValue } from "./ColumnFilter";
import AssetActions, { type ActionId } from "./AssetActions";
import ManageFieldsPanel from "./ManageFieldsPanel";
import { parseStringDate, parseDateString } from "@/util/date/parseDate";
import { getManageDataFromCache, setManageDataInCache, setSelectedBienFromGrid } from "@/lib/cache/fixedAssetsBootstrapCache";

const PAGE_SIZE_OPTIONS = [
    { key: "5", value: "5" },
    { key: "10", value: "10" },
    { key: "15", value: "15" },
] as const;

const COMPACT_PAGE_MEDIA = "(max-width: 1280px), (max-height: 620px)";

function readViewportCompact(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(COMPACT_PAGE_MEDIA).matches;
}

export default function ManageContainer({ mode = "activo-fijo" }: { mode?: "activo-fijo" | "simulacion" }) : React.ReactElement {
    const router = useRouter();
    const dispatch = useDispatch();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);

    const options: RequestInit = useMemo(() => ({
        method: 'POST',
        body: JSON.stringify({
            petition: mode === "simulacion" ? "GetSimulacion" : "Get",
            client: client,
            data: {}
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }), [client, mode]);

    const manageCacheKey = useMemo(() => `${client}::${mode}`, [client, mode]);
    const cachedManageData = useMemo(() => getManageDataFromCache(manageCacheKey), [manageCacheKey]);
    const fetchConfig = useMemo(() => ({
        initialData: cachedManageData,
        skipInitialFetch: cachedManageData != null,
        onData: (nextData: FixedAssetsData) => setManageDataInCache(manageCacheKey, nextData),
    }), [cachedManageData, manageCacheKey]);

    const { data:fixedAssetsData, error, loading, setData, refetch } = useFetch<FixedAssetsData>("/api/fixedAssets/manage", options, fetchConfig);

    console.log(fixedAssetsData);

    const columnHelper = createColumnHelper<FixedAssets>();

    const [dataTable, setDataTable] = React.useState<FixedAssets[]>(fixedAssetsData?.fixedAssets || []);

    const [viewportCompact, setViewportCompact] = useState(() => readViewportCompact());
    const [pagination, setPagination] = useState(() => ({
        pageIndex: 0,
        pageSize: 10,
    }));

    const [sorting, setSorting] = useState<SortingState>([]);

    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

    const [isEntriesSelectOpen, setIsEntriesSelectOpen] = useState(false);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterValues, setFilterValues] = useState<FilterValues>({
        cuenta: '',
        centroCosto: '',
        planta: '',
        unidadNegocio: '',
        ubicacion: '',
        baja: '',
        origen: '',
    });
    const [showFilterAppliedAlert, setShowFilterAppliedAlert] = useState(false);
    const [showBajaSuccessAlert, setShowBajaSuccessAlert] = useState(false);
    const [showBajaErrorAlert, setShowBajaErrorAlert] = useState(false);
    const [showTransferSuccessAlert, setShowTransferSuccessAlert] = useState(false);
    const [showTransferErrorAlert, setShowTransferErrorAlert] = useState(false);
    const filterAppliedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bajaAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transferAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [columnFilterColumnId, setColumnFilterColumnId] = useState<string | null>(null);
    const [closingColumnId, setClosingColumnId] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterValue>>({});

    const [actionsOpenRowId, setActionsOpenRowId] = useState<string | null>(null);
    const [actionsTriggerRect, setActionsTriggerRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    const [manageFieldsOpen, setManageFieldsOpen] = useState(false);
    const [manageFieldsTriggerRect, setManageFieldsTriggerRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const manageFieldsTriggerRef = useRef<HTMLElement | null>(null);

    const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
    const [bajaModalAssets, setBajaModalAssets] = useState<FixedAssets[]>([]);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferModalAssets, setTransferModalAssets] = useState<FixedAssets[]>([]);
    const [isBajaFisicaModalOpen, setIsBajaFisicaModalOpen] = useState(false);
    const [bajaFisicaBienId, setBajaFisicaBienId] = useState('');
    const [showBajaFisicaSuccessAlert, setShowBajaFisicaSuccessAlert] = useState(false);
    const [showBajaFisicaErrorAlert, setShowBajaFisicaErrorAlert] = useState(false);
    const bajaFisicaAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const bottomScrollbarRef = useRef<HTMLDivElement | null>(null);
    const tableHorizontalRef = useRef<HTMLDivElement | null>(null);
    const scrollSyncLockRef = useRef(false);
    const SEARCH_DEBOUNCE_MS = 350;
    const isSimulationMode = mode === "simulacion";
    const fixedAssetsContextKey = isSimulationMode ? `${client}::simulacion` : client;

    useEffect(() => {
        setDataTable(fixedAssetsData?.fixedAssets || []);
    }, [fixedAssetsData]);

    useEffect(() => {
        const fields = fixedAssetsData?.fieldsManage ?? [];
        if (fields.length > 0) {
            const sorted = [...fields].sort((a, b) => (a.lisordencampos ?? 0) - (b.lisordencampos ?? 0));
            setColumnOrder(prev => (prev.length === 0 ? [...sorted.map(f => f.IdCampo), 'manage'] : prev));
            setColumnVisibility(Object.fromEntries([...sorted.map(f => [f.IdCampo, f.listShow]), ['manage', true]]));
        }
    }, [fixedAssetsData?.fieldsManage]);

    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            if (filterAppliedTimeoutRef.current) clearTimeout(filterAppliedTimeoutRef.current);
            if (bajaAlertTimeoutRef.current) clearTimeout(bajaAlertTimeoutRef.current);
            if (transferAlertTimeoutRef.current) clearTimeout(transferAlertTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia(COMPACT_PAGE_MEDIA);
        const sync = () => setViewportCompact(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    useEffect(() => {
        setPagination((prev) => {
            const allowed = [5, 10, 15];
            if (allowed.includes(prev.pageSize)) return prev;
            return { pageIndex: 0, pageSize: 10 };
        });
    }, [viewportCompact]);

    /** Solo formatea a MM/YYYY si el valor es una fecha (Date o string tipo 2002-03-01 00:00:00.000). No toca números ni otros textos. */
    function formatCellDate(value: unknown): string | number {
        if (value == null || value === '') return '';
        if (value instanceof Date) {
            if (isNaN(value.getTime())) return String(value);
            return parseStringDate(value);
        }
        const s = String(value).trim();
        if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return typeof value === 'number' ? value : String(value);
        const d = new Date(s);
        if (isNaN(d.getTime())) return typeof value === 'number' ? value : String(value);
        return parseStringDate(d);
    }

    /** Formato de celda: fechas MM/YYYY; índices con 7 decimales; resto de números siempre con 2 decimales. */
    function formatCellValue(value: unknown, columnId: string): React.ReactNode {
        if (value == null || value === '') return '';
        if (typeof value === 'number' && !isNaN(value)) {
            const isIndice = columnId.toLowerCase().includes('indice');
            if (isIndice) return value.toFixed(7);
            return value.toFixed(2);
        }
        return formatCellDate(value);
    }

    /** Convierte a timestamp solo si el valor es una fecha (Date o string tipo 2002-03-01 00:00:00.000 o MM/YYYY). No interpreta números como fechas. */
    function toComparableDate(val: unknown): number | null {
        if (val == null) return null;
        if (typeof val === 'number') return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
        const s = String(val).trim();
        if (!s) return null;
        if (/^\d{1,2}\/\d{4}$/.test(s)) return parseDateString(s).getTime();
        if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.getTime();
    }

    function getFieldValue(row: FixedAssets, fieldId: string): unknown {
        const record = row as Record<string, unknown>;
        if (record[fieldId] !== undefined) return record[fieldId];
        const lower = fieldId.toLowerCase();
        const byLower = Object.keys(record).find((k) => k.toLowerCase() === lower);
        if (byLower) return record[byLower];
        return undefined;
    }

    const columns = useMemo(() => [
        ...(fixedAssetsData?.fieldsManage ?? []).map(field => columnHelper.accessor((row : FixedAssets) => getFieldValue(row, field.IdCampo), {
            id: field.IdCampo,
            size: 200,
            header: field.BrowNombre ?? '',
            cell: info => {
                const value = info.getValue();
                const content = formatCellValue(value, info.column.id);
                const type = getColumnType(info.column.id, value);
                if (type === 'number') return <span className="block text-right w-full">{content}</span>;
                return content;
            },
            sortingFn: "myCustomSorting" as SortingFnOption<FixedAssets>,
        })),
        columnHelper.display({
            id: 'manage',
            header: 'Manage',
            size: 80,
            cell: ({ row }) => (
                <div
                    data-asset-actions-trigger
                    role="button"
                    tabIndex={0}
                    className="px-4 flex justify-center cursor-pointer"
                    title="Acciones"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (actionsOpenRowId === row.id) {
                            setActionsOpenRowId(null);
                            setActionsTriggerRect(null);
                            return;
                        }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setActionsOpenRowId(row.id);
                        setActionsTriggerRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).click();
                        }
                    }}
                >
                    <Actions style="h-[20px] w-[20px] xl:h-[24px] xl:w-[24px] rounded-full hover:bg-gabu-300 transition-colors durarion-100" />
                </div>
            ),
        }),
    ], [fixedAssetsData?.fieldsManage, columnHelper, actionsOpenRowId]);

    const visibleColumnIds = useMemo(() => {
        const fields = fixedAssetsData?.fieldsManage ?? [];
        return fields.filter(f => columnVisibility[f.IdCampo] !== false).map(f => f.IdCampo);
    }, [fixedAssetsData?.fieldsManage, columnVisibility]);

    const handleVisibilityChange = useCallback((fieldId: string, listShow: boolean) => {
        setColumnVisibility(prev => ({ ...prev, [fieldId]: listShow }));
    }, []);

    const table = useReactTable({
        columns,
        data: dataTable,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onColumnOrderChange: setColumnOrder,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            pagination,
            sorting,
            columnOrder,
            columnVisibility,
        },
        columnResizeMode: 'onChange',
        sortingFns: {
            myCustomSorting: (rowA, rowB, columnId) => {
                const rowAValue = rowA.getValue(columnId);
                const rowBValue = rowB.getValue(columnId);

                if(rowAValue == null && rowBValue == null) return 0;
                if(rowAValue == null) return -1;
                if(rowBValue == null) return 1;

                const a = String(rowAValue).toLowerCase().trim();
                const b = String(rowBValue).toLowerCase().trim();

                if(!isNaN(Number(a)) && !isNaN(Number(b))) {
                    return Number(a) - Number(b);
                }

                const aDate = toComparableDate(rowAValue);
                const bDate = toComparableDate(rowBValue);
                if (aDate != null && bDate != null) return aDate - bDate;

                if(a === "true" || a === "false") {
                    return (a === "true" ? 1 : 0) - (b === "true" ? 1 : 0);
                }

                return a.localeCompare(b);
            },
        },
    });

    const filterFieldIds = useMemo(() => {
        const fields = fixedAssetsData?.fieldsManage ?? [];
        const map: Partial<Record<keyof FilterValues, string>> = {};
        const keyToPattern: Record<string, string> = {
            cuenta: 'idactivo',
            centroCosto: 'idcencos',
            planta: 'idplanta',
            unidadNegocio: 'idunegocio',
            ubicacion: 'idzona',
            origen: 'idorigen',
        };
        for (const [filterKey, pattern] of Object.entries(keyToPattern)) {
            const field = fields.find((f) => f.IdCampo.toLowerCase().includes(pattern));
            if (field) map[filterKey as keyof FilterValues] = field.IdCampo;
        }
        return map;
    }, [fixedAssetsData?.fieldsManage]);

    function getRowVal(row: FixedAssets, key: string): unknown {
        const r = row as Record<string, unknown>;
        if (r[key] !== undefined) return r[key];
        const lower = key.toLowerCase();
        if (r[lower] !== undefined) return r[lower];
        if (r[key.toUpperCase()] !== undefined) return r[key.toUpperCase()];
        const matchedKey = Object.keys(r).find((k) => k.toLowerCase() === lower);
        return matchedKey != null ? r[matchedKey] : undefined;
    }

    /** Valor de FecBaj en actifijo; la columna puede venir como me01.fecbaj desde la vista */
    function getFecBaj(row: FixedAssets): unknown {
        const r = row as Record<string, unknown>;
        const keys = ['me01.fecbaj', 'me01.FecBaj', 'FecBaj', 'fecbaj'];
        for (const k of keys) {
            if (r[k] !== undefined) return r[k];
        }
        const fecbajKey = Object.keys(r).find((k) => k.toLowerCase().includes('fecbaj'));
        return fecbajKey != null ? r[fecbajKey] : undefined;
    }

    function rowPassesColumnFilters(row: FixedAssets): boolean {
        for (const [columnId, filter] of Object.entries(columnFilters)) {
            const cellVal = getRowVal(row, columnId);
            const strVal = cellVal != null ? String(cellVal).trim() : '';
            if (filter.type === 'number') {
                const numVal = strVal !== '' && !isNaN(Number(strVal)) ? Number(strVal) : null;
                const filterNum = filter.value !== '' && !isNaN(Number(filter.value)) ? Number(filter.value) : null;
                if (filterNum == null) continue;
                if (numVal == null) return false;
                switch (filter.condition) {
                    case 'gt': if (!(numVal > filterNum)) return false; break;
                    case 'lt': if (!(numVal < filterNum)) return false; break;
                    case 'gte': if (!(numVal >= filterNum)) return false; break;
                    case 'lte': if (!(numVal <= filterNum)) return false; break;
                    case 'eq': if (numVal !== filterNum) return false; break;
                    default: break;
                }
            } else if (filter.type === 'string') {
                const v = filter.value.toLowerCase();
                if (!v) continue;
                const s = strVal.toLowerCase();
                switch (filter.condition) {
                    case 'contains': if (!s.includes(v)) return false; break;
                    case 'equals': if (s !== v) return false; break;
                    case 'startsWith': if (!s.startsWith(v)) return false; break;
                    case 'endsWith': if (!s.endsWith(v)) return false; break;
                    default: break;
                }
            } else if (filter.type === 'date') {
                const cellDate = toComparableDate(cellVal);
                if (cellDate == null) return false;
                const desde = filter.desde ? toComparableDate(filter.desde) : null;
                const hasta = filter.hasta ? toComparableDate(filter.hasta) : null;
                if (desde != null && cellDate < desde) return false;
                if (hasta != null && cellDate > hasta) return false;
            }
        }
        return true;
    }

    function applyFilters(filters: FilterValues) {
        setFilterValues(filters);
        const sourceData = fixedAssetsData?.fixedAssets ?? [];
        const filtered = sourceData.filter((row) => {
            if (filters.cuenta && String(getRowVal(row, filterFieldIds.cuenta ?? 'IdActivo') ?? '') !== filters.cuenta) return false;
            if (filters.centroCosto && String(getRowVal(row, filterFieldIds.centroCosto ?? 'IdCencos') ?? '') !== filters.centroCosto) return false;
            if (filters.planta && String(getRowVal(row, filterFieldIds.planta ?? 'IdPlanta') ?? '') !== filters.planta) return false;
            if (filters.unidadNegocio && String(getRowVal(row, filterFieldIds.unidadNegocio ?? 'IdUNegocio') ?? '') !== filters.unidadNegocio) return false;
            if (filters.ubicacion && String(getRowVal(row, filterFieldIds.ubicacion ?? 'idZona') ?? getRowVal(row, 'IdZona') ?? '') !== filters.ubicacion) return false;
            if (filters.origen && String(getRowVal(row, filterFieldIds.origen ?? 'IdOrigen') ?? '') !== filters.origen) return false;
            if (filters.baja === 'bajas-ejercicio') {
                const dIni = fixedAssetsData?.feciniEjercicio != null ? toComparableDate(fixedAssetsData.feciniEjercicio) : null;
                if (dIni == null) return false;
                const dBaj = toComparableDate(getFecBaj(row));
                if (dBaj == null || dBaj < dIni) return false;
            }
            if (filters.baja === 'con-baja') {
                if (toComparableDate(getFecBaj(row)) == null) return false;
            }
            return true;
        });
        setDataTable(filtered);
    }

    useEffect(() => {
        const sourceData = fixedAssetsData?.fixedAssets ?? [];
        if (sourceData.length === 0) return;
        const hasModalFilters = Object.values(filterValues).some((v) => v !== '');
        const hasColumnFilters = Object.keys(columnFilters).length > 0;
        let filtered = sourceData;
        if (hasModalFilters) {
            filtered = filtered.filter((row) => {
                if (filterValues.cuenta && String(getRowVal(row, filterFieldIds.cuenta ?? 'IdActivo') ?? '') !== filterValues.cuenta) return false;
                if (filterValues.centroCosto && String(getRowVal(row, filterFieldIds.centroCosto ?? 'IdCencos') ?? '') !== filterValues.centroCosto) return false;
                if (filterValues.planta && String(getRowVal(row, filterFieldIds.planta ?? 'IdPlanta') ?? '') !== filterValues.planta) return false;
                if (filterValues.unidadNegocio && String(getRowVal(row, filterFieldIds.unidadNegocio ?? 'IdUNegocio') ?? '') !== filterValues.unidadNegocio) return false;
                if (filterValues.ubicacion && String(getRowVal(row, filterFieldIds.ubicacion ?? 'idZona') ?? getRowVal(row, 'IdZona') ?? '') !== filterValues.ubicacion) return false;
                if (filterValues.origen && String(getRowVal(row, filterFieldIds.origen ?? 'IdOrigen') ?? '') !== filterValues.origen) return false;
                if (filterValues.baja === 'bajas-ejercicio') {
                    const dIni = fixedAssetsData?.feciniEjercicio != null ? toComparableDate(fixedAssetsData.feciniEjercicio) : null;
                    if (dIni == null) return false;
                    const dBaj = toComparableDate(getFecBaj(row));
                    if (dBaj == null || dBaj < dIni) return false;
                }
                if (filterValues.baja === 'con-baja') {
                    if (toComparableDate(getFecBaj(row)) == null) return false;
                }
                return true;
            });
        }
        if (hasColumnFilters) {
            filtered = filtered.filter((row) => rowPassesColumnFilters(row));
        }
        setDataTable(filtered);
    }, [fixedAssetsData?.fixedAssets, fixedAssetsData?.feciniEjercicio, filterValues, filterFieldIds, columnFilters]);

    function applySearch(value: string) {
        const sourceData = fixedAssetsData?.fixedAssets ?? [];
        const fields = fixedAssetsData?.fieldsManage ?? [];
        const hasModalFilters = Object.values(filterValues).some((v) => v !== '');
        const hasColumnFilters = Object.keys(columnFilters).length > 0;
        let base = sourceData;
        if (hasModalFilters) {
            const filtered: FixedAssets[] = [];
            sourceData.forEach((row) => {
                if (filterValues.cuenta && String(getRowVal(row, filterFieldIds.cuenta ?? 'IdActivo') ?? '') !== filterValues.cuenta) return;
                if (filterValues.centroCosto && String(getRowVal(row, filterFieldIds.centroCosto ?? 'IdCencos') ?? '') !== filterValues.centroCosto) return;
                if (filterValues.planta && String(getRowVal(row, filterFieldIds.planta ?? 'IdPlanta') ?? '') !== filterValues.planta) return;
                if (filterValues.unidadNegocio && String(getRowVal(row, filterFieldIds.unidadNegocio ?? 'IdUNegocio') ?? '') !== filterValues.unidadNegocio) return;
                if (filterValues.ubicacion && String(getRowVal(row, filterFieldIds.ubicacion ?? 'idZona') ?? getRowVal(row, 'IdZona') ?? '') !== filterValues.ubicacion) return;
                if (filterValues.origen && String(getRowVal(row, filterFieldIds.origen ?? 'IdOrigen') ?? '') !== filterValues.origen) return;
                if (filterValues.baja === 'bajas-ejercicio') {
                    const dIni = fixedAssetsData?.feciniEjercicio != null ? toComparableDate(fixedAssetsData.feciniEjercicio) : null;
                    if (dIni == null) return;
                    const dBaj = toComparableDate(getFecBaj(row));
                    if (dBaj == null || dBaj < dIni) return;
                }
                if (filterValues.baja === 'con-baja') {
                    if (toComparableDate(getFecBaj(row)) == null) return;
                }
                filtered.push(row);
            });
            base = filtered;
        }
        if (hasColumnFilters) {
            base = base.filter((row) => rowPassesColumnFilters(row));
        }
        if (!value) {
            setDataTable(base);
            return;
        }
        const valueLower = value.toLowerCase();
        const filteredData = base.filter((item) =>
            fields.some((field) => {
                const fieldValue = getFieldValue(item, field.IdCampo);
                return fieldValue != null && String(fieldValue).toLowerCase().includes(valueLower);
            })
        );
        setDataTable(filteredData);
    }

    function handleSearch(event: React.FormEvent<HTMLInputElement>) {
        const value = event.currentTarget.value.trim();
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        if (!value) {
            applySearch("");
            return;
        }
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            applySearch(value);
        }, SEARCH_DEBOUNCE_MS);
    }

    function removeAllFilters() {
        setFilterValues({
            cuenta: '',
            centroCosto: '',
            planta: '',
            unidadNegocio: '',
            ubicacion: '',
            baja: '',
            origen: '',
        });
        setColumnFilters({});
        setColumnFilterColumnId(null);
        setClosingColumnId(null);
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
        }
        applySearch('');
    }

    async function changeOrder(newOrder: string[]) {
        const tableId = fixedAssetsData?.fieldsManage?.[0]?.IdTabla ?? 'actifijo';
        const updatedOrder = newOrder
            .filter((columnId) => columnId !== 'manage')
            .map((columnId, index) => ({
                tableId,
                fieldId: columnId,
                order: index
            }));

        const res = await fetch('/api/fixedAssets/manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                petition: 'UpdateOrder',
                client,
                data: updatedOrder
            })
        });
        return res.json();
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = columnOrder.indexOf(active.id as string);
            const newIndex = columnOrder.indexOf(over.id as string);
            const newOrder = arrayMove(columnOrder, oldIndex, newIndex);

            setColumnOrder(newOrder);
            await changeOrder(newOrder);
        }
    }

    function getPaginationItems() {
        const totalPages = table.getPageCount();
        const currentPage = table.getState().pagination.pageIndex + 1;
        const items = [];
        
        // Configuración
        const siblingCount = 2; // Cuántas páginas mostrar a los lados de la actual

        // Si el total de páginas es pequeño, las mostramos todas
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
            } 

            else if (showLeftDots && !showRightDots) {
                const rightRange = Array.from({ length: 6 }, (_, i) => totalPages - 6 + i + 1);
                items.push(1, "...", ...rightRange);
            } 
            else {
                const middleRange = Array.from(
                    { length: rightSiblingIndex - leftSiblingIndex + 1 },
                    (_, i) => leftSiblingIndex + i
                );
                items.push(1, "...", ...middleRange, "...", totalPages);
            }
        }

        return items.map((page, index) => {
            if (page === "...") {
                return <span key={`dots-${index}`} className="text-gabu-700 text-xs px-1 xl:px-2">...</span>;
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

    function handleChoosePageSize(e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) {
        const li = e.currentTarget;
        const key = li.dataset.key;
        const value = li.textContent ?? "";
        if (ref.current && key) {
            ref.current.textContent = value;
            ref.current.dataset.key = key;
            table.setPageSize(Number(key));
            table.setPageIndex(0);
        }
    }

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

    const pageSizeOptions = PAGE_SIZE_OPTIONS;

    async function exportToExcel() {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        const visibleColumns = table.getVisibleFlatColumns().filter(col => col.id !== 'get');

        worksheet.columns = visibleColumns.map(col => ({ header: col.columnDef.header as string, key: col.id, width: 20 }));

        const rows = table.getPrePaginationRowModel().rows;

        rows.forEach(row => {
            const rowData: { [key: string]: string } = {};
            visibleColumns.forEach(col => {
                const val = row.getValue(col.id);
                const formatted = formatCellValue(val, col.id);
                rowData[col.id] = formatted != null && formatted !== '' ? String(formatted) : '';
            });
            worksheet.addRow(rowData);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fixedAssetsData?.fieldsManage?.[0]?.IdTabla}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <>
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setTransferModalAssets([]);
                }}
                assets={transferModalAssets}
                fieldsManage={fixedAssetsData?.fieldsManage ?? []}
                cuentasDestinoOptions={fixedAssetsData?.cuentasDestinoOptions ?? []}
                fecproTransferenciaDefault={fixedAssetsData?.fecproTransferenciaDefault ?? ''}
                client={client}
                onSuccess={() => {
                    refetch();
                    setShowTransferSuccessAlert(true);
                    if (transferAlertTimeoutRef.current) clearTimeout(transferAlertTimeoutRef.current);
                    transferAlertTimeoutRef.current = setTimeout(() => {
                        transferAlertTimeoutRef.current = null;
                        setShowTransferSuccessAlert(false);
                    }, 3000);
                }}
                onError={() => {
                    setShowTransferErrorAlert(true);
                    if (transferAlertTimeoutRef.current) clearTimeout(transferAlertTimeoutRef.current);
                    transferAlertTimeoutRef.current = setTimeout(() => {
                        transferAlertTimeoutRef.current = null;
                        setShowTransferErrorAlert(false);
                    }, 5000);
                }}
            />
            <BajaModal
                isOpen={isBajaModalOpen}
                onClose={() => {
                    setIsBajaModalOpen(false);
                    setBajaModalAssets([]);
                }}
                assets={bajaModalAssets}
                fieldsManage={fixedAssetsData?.fieldsManage ?? []}
                tipoBajaOptions={fixedAssetsData?.tipoBajaOptions ?? []}
                fecproBajaDefault={fixedAssetsData?.fecproBajaDefault ?? ''}
                client={client}
                onSuccess={() => {
                    refetch();
                    setShowBajaSuccessAlert(true);
                    if (bajaAlertTimeoutRef.current) clearTimeout(bajaAlertTimeoutRef.current);
                    bajaAlertTimeoutRef.current = setTimeout(() => {
                        bajaAlertTimeoutRef.current = null;
                        setShowBajaSuccessAlert(false);
                    }, 3000);
                }}
                onError={() => {
                    setShowBajaErrorAlert(true);
                    if (bajaAlertTimeoutRef.current) clearTimeout(bajaAlertTimeoutRef.current);
                    bajaAlertTimeoutRef.current = setTimeout(() => {
                        bajaAlertTimeoutRef.current = null;
                        setShowBajaErrorAlert(false);
                    }, 5000);
                }}
            />
            <BajaFisicaModal
                isOpen={isBajaFisicaModalOpen}
                onClose={() => {
                    setIsBajaFisicaModalOpen(false);
                    setBajaFisicaBienId('');
                }}
                bienId={bajaFisicaBienId}
                client={client}
                onSuccess={() => {
                    refetch();
                    setShowBajaFisicaSuccessAlert(true);
                    if (bajaFisicaAlertTimeoutRef.current) clearTimeout(bajaFisicaAlertTimeoutRef.current);
                    bajaFisicaAlertTimeoutRef.current = setTimeout(() => {
                        bajaFisicaAlertTimeoutRef.current = null;
                        setShowBajaFisicaSuccessAlert(false);
                    }, 3000);
                }}
                onError={() => {
                    setShowBajaFisicaErrorAlert(true);
                    if (bajaFisicaAlertTimeoutRef.current) clearTimeout(bajaFisicaAlertTimeoutRef.current);
                    bajaFisicaAlertTimeoutRef.current = setTimeout(() => {
                        bajaFisicaAlertTimeoutRef.current = null;
                        setShowBajaFisicaErrorAlert(false);
                    }, 5000);
                }}
            />
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                client={client}
                onApply={(filters) => {
                    applyFilters(filters);
                    setIsFilterModalOpen(false);
                    const hasFilters = Object.values(filters).some((v) => v !== '');
                    if (hasFilters) {
                        if (filterAppliedTimeoutRef.current) clearTimeout(filterAppliedTimeoutRef.current);
                        setShowFilterAppliedAlert(true);
                        filterAppliedTimeoutRef.current = setTimeout(() => {
                            filterAppliedTimeoutRef.current = null;
                            setShowFilterAppliedAlert(false);
                        }, 3000);
                    }
                }}
                initialFilters={filterValues}
            />
            <AssetActions
                isOpen={!!actionsOpenRowId}
                onClose={() => {
                    setActionsOpenRowId(null);
                    setActionsTriggerRect(null);
                }}
                triggerRect={actionsTriggerRect}
                rowId={actionsOpenRowId}
                allowedActions={isSimulationMode ? ['consultar'] : undefined}
                onAction={(rowId, actionId) => {
                    const row = table.getPrePaginationRowModel().rows.find((r) => String(r.id) === String(rowId));
                    if (!row) return;
                    const rowData = row.original;
                    const idParts = ['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].map((key) => {
                        let v = getRowVal(rowData, key);
                        if (v == null || v === '') v = getRowVal(rowData, `cabecera.${key}`);
                        return String(v ?? '');
                    });
                    const id = idParts.join('-');
                    if (!id || id === '---') return;
                    if (isSimulationMode) {
                        if (actionId !== 'consultar') return;
                        setSelectedBienFromGrid(fixedAssetsContextKey, id, rowData as Record<string, unknown>);
                        const tableName = `AbmSimulationFixedAssetConsult-${id}`;
                        const path = `/simulations/consult/${id}`;
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Consultar bien ${id}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                        return;
                    }
                    if (actionId === 'modificar' || actionId === 'consultar' || actionId === 'clonar' || actionId === 'alta-agregado') {
                        setSelectedBienFromGrid(fixedAssetsContextKey, id, rowData as Record<string, unknown>);
                    }
                    if (actionId === 'modificar') {
                        const tableName = `AbmFixedAssetModify-${id}`;
                        const path = `/fixedAssets/modify/${id}`;
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Modificacion bien ${id}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                    } else if (actionId === 'consultar') {
                        const tableName = `AbmFixedAssetConsult-${id}`;
                        const path = `/fixedAssets/consult/${id}`;
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Consultar bien ${id}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                    } else if (actionId === 'clonar') {
                        const tableName = `AbmFixedAssetClone-${id}`;
                        const path = `/fixedAssets/clone/${id}`;
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Clonar bien ${id}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                    } else if (actionId === 'alta-agregado') {
                        const tableName = `AbmFixedAssetAltaAgregado-${id}`;
                        const path = `/fixedAssets/alta-agregado/${id}`;
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Alta agregado bien ${id}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                    } else if (actionId === 'baja') {
                        const idCodigoVal = String(getRowVal(rowData, 'idCodigo') ?? getRowVal(rowData, 'cabecera.idcodigo') ?? '').trim();
                        if (!idCodigoVal) return;
                        const allAssets = fixedAssetsData?.fixedAssets ?? [];
                        const sameIdCodigo = allAssets.filter((a) => {
                            const ac = String(getRowVal(a, 'idCodigo') ?? getRowVal(a, 'cabecera.idcodigo') ?? getRowVal(a, 'idcodigo') ?? '').trim();
                            return ac === idCodigoVal;
                        });
                        setBajaModalAssets(sameIdCodigo);
                        setIsBajaModalOpen(true);
                    } else if (actionId === 'transferencia') {
                        const idCodigoVal = String(getRowVal(rowData, 'idCodigo') ?? getRowVal(rowData, 'cabecera.idcodigo') ?? '').trim();
                        if (!idCodigoVal) return;
                        const allAssets = fixedAssetsData?.fixedAssets ?? [];
                        const sameIdCodigo = allAssets.filter((a) => {
                            const ac = String(getRowVal(a, 'idCodigo') ?? getRowVal(a, 'cabecera.idcodigo') ?? getRowVal(a, 'idcodigo') ?? '').trim();
                            return ac === idCodigoVal;
                        });
                        setTransferModalAssets(sameIdCodigo);
                        setIsTransferModalOpen(true);
                    } else if (actionId === 'baja-fisica') {
                        setBajaFisicaBienId(id);
                        setIsBajaFisicaModalOpen(true);
                    }
                }}
            />
            <ManageFieldsPanel
                isOpen={manageFieldsOpen}
                onClose={() => {
                    setManageFieldsOpen(false);
                    setManageFieldsTriggerRect(null);
                    manageFieldsTriggerRef.current = null;
                }}
                triggerRect={manageFieldsTriggerRect}
                triggerRef={manageFieldsTriggerRef}
                fields={fixedAssetsData?.fieldsManage ?? []}
                visibleIds={visibleColumnIds}
                onVisibilityChange={handleVisibilityChange}
                client={client}
            />
            <div className="mt-2 border-bottom border-gabu-300 h-[12%] flex items-end p-1.5 justify-between gap-2 px-3 xl:mt-2.5 xl:p-2 xl:px-5 xl:gap-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mt-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-auto [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-h-[2.8rem] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:items-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mb-1">
                <div className="d-flex flex justify-start gap-1.5 xl:gap-2 min-w-0 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                    <div className="input-group input-group-sm flex bg-gabu-700 rounded-md py-0.5 px-2 gap-1 xl:py-1 xl:px-2 xl:gap-1.5 items-center min-w-0 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-7 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-[10.25rem]">
                        <Search style="stroke-gabu-100 !h-[9px] !w-[9px] xl:!h-[12px] xl:!w-[12px] shrink-0"/>
                        <input ref={searchInputRef} type="text" placeholder="Buscar..." className="form-control form-control-sm focus:outline-none text-gabu-100 w-full bg-transparent text-[11px] xl:text-xs [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[10px]" onInput={handleSearch}/>
                    </div>
                    <div className={`d-flex flex bg-gabu-700 items-center pr-1 xl:pr-1.5 gap-1 xl:gap-1.5 shrink-0 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pr-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-7 ${isEntriesSelectOpen ? 'rounded-t-md rounded-b-none' : 'rounded-md'}`} id="select-entries-cont">
                    <Select
                        key={`manage-entries-${viewportCompact ? "compact" : "full"}-${pagination.pageSize}`}
                        label=""
                        hasLabel={false}
                        isLogin={false}
                        variant="entriesPerPage"
                        controlClassName="[@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pl-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pr-1.5"
                        onListOpenChange={setIsEntriesSelectOpen}
                        options={pageSizeOptions.map((o) => ({ key: o.key, value: o.value }))}
                        defaultValue={pageSizeOptions.some((o) => o.key === String(pagination.pageSize)) ? String(pagination.pageSize) : pageSizeOptions[0].key}
                        chooseOptionHandler={handleChoosePageSize}
                    />
                    <p className="text-gabu-100 whitespace-nowrap text-[11px] xl:text-xs [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[10px]">Entradas por pagina</p>
                    </div>
                </div>
                <div className="d-flex flex justify-end gap-1.5 xl:gap-2.5 shrink-0 flex-wrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                    <div className="btn btn-sm bg-gabu-700 rounded-md p-1 xl:p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 flex items-center justify-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-w-7 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-h-7" onClick={() => refetch()} title="Recargar tabla">
                        <Reload style="!h-3.5 !w-3.5 xl:!h-4 xl:!w-4 shrink-0 fill-current text-gabu-100"/>
                    </div>
                    <div className="btn btn-sm bg-gabu-700 rounded-md p-1 xl:p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 flex items-center justify-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-w-7 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-h-7">
                        <Excel style="!h-3.5 !w-3.5 xl:!h-4 xl:!w-4 shrink-0 fill-current text-gabu-100" onClick={exportToExcel}/>
                    </div>
                    <div className="btn btn-sm bg-gabu-700 rounded-md py-0.5 px-2.5 xl:py-1 xl:px-4 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 flex items-center gap-1 xl:gap-1.5 relative filter-button [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2" onClick={() => setIsFilterModalOpen(true)}>
                        <Filter style="h-4 w-4 xl:h-5 xl:w-5 stroke-current text-gabu-100 shrink-0"/>
                    <p className="text-gabu-100 text-[11px] xl:text-xs [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[10px]">Filtrar</p>
                    </div>
                    <div className="btn btn-sm bg-gabu-700 rounded-md py-0.5 px-2.5 xl:py-1 xl:px-4 cursor-pointer hover:bg-gabu-300 transition-colors duration-100 flex items-center gap-1 xl:gap-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2" onClick={removeAllFilters} title="Remover todos los filtros">
                        <RemoveFilter style="h-4 w-4 xl:h-5 xl:w-5 stroke-current text-gabu-100 shrink-0"/>
                        <p className="text-gabu-100 text-[11px] xl:text-xs [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[10px]">Remover filtros</p>
                    </div>
                    {!isSimulationMode && (
                    <div
                        className="btn btn-sm bg-gabu-900 rounded-md py-0.5 px-3 xl:py-1 xl:px-5 cursor-pointer hover:bg-gabu-700 transition-colors duration-100 flex items-center gap-1 xl:gap-1.5 btn-add-fixed-asset [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-0.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2"
                        onClick={() => {
                            const targetPath = "/fixedAssets/add";
                            const found = clientMenu?.menu?.flatMap((m, menuId) =>
                                m.submenu.map((s, submenuId) => ({ s, menuId, submenuId }))
                            )?.find(({ s }) => s.path === targetPath);
                            if (found) {
                                dispatch(navActions.openPage({ client, menuId: found.menuId, submenuId: found.submenuId }));
                                router.push(targetPath);
                            }
                        }}
                    >
                    <svg className="h-4 w-4 xl:h-5 xl:w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="#CDD5D8"/>
                    </svg>
                    <p className="text-gabu-100 text-[11px] xl:text-xs [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[10px]">Añadir bien</p>
                    </div>
                    )}
                </div>
            </div>
            <div className="h-[88%] w-full pt-3 xl:pt-8 flex items-center flex-col relative px-3 xl:px-5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pt-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                <Alert 
                    message={error ? error.message || "Error al cargar los datos" : null} 
                    type="error" 
                    show={!!error} 
                />
                <Alert 
                    message="Filtro aplicado" 
                    type="success" 
                    show={showFilterAppliedAlert} 
                />
                <Alert 
                    message="Se dio de baja el bien con éxito" 
                    type="success" 
                    show={showBajaSuccessAlert} 
                />
                <Alert 
                    message="Ocurrió un error al dar de baja el bien" 
                    type="error" 
                    show={showBajaErrorAlert} 
                />
                <Alert
                    message="Se transfirió el bien con éxito"
                    type="success"
                    show={showTransferSuccessAlert}
                />
                <Alert
                    message="Ocurrió un error al transferir el bien"
                    type="error"
                    show={showTransferErrorAlert}
                />
                <Alert
                    message="Se eliminó el bien con éxito"
                    type="success"
                    show={showBajaFisicaSuccessAlert}
                />
                <Alert
                    message="Ocurrió un error al eliminar el bien"
                    type="error"
                    show={showBajaFisicaErrorAlert}
                />
                {loading && (
                    <div className="relative w-full h-full overflow-x-auto table-scroll">
                        <div className="w-full overflow-auto table-container grid">
                            <div className="min-w-full">
                                <Skeleton count={10} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1"/>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && !error && (
                    <div className="relative w-full max-h-[95%] flex flex-col items-center min-w-0 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:max-h-full">
                        <div className="w-full overflow-y-auto overflow-x-hidden table-scroll table-responsive max-h-[58vh] xl:max-h-[64vh] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:max-h-[47vh]">
                            <div
                                ref={tableHorizontalRef}
                                onScroll={syncFromTableScrollbar}
                                className="w-full overflow-x-auto overflow-y-hidden table-container grid table-responsive [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                            >
                                <div className="min-w-full">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
                                        <table className="border-collapse divide-y-2 divide-gabu-900/25 table-fixed w-full" {...{style: {minWidth: table.getTotalSize()}}}>
                                        <thead>
                                            {table.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    <SortableContext key={headerGroup.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                                                        {headerGroup.headers.map(header => (
                                                            <DraggableHeader
                                                                key={header.id}
                                                                header={header}
                                                                onOpenColumnFilter={(columnId) => {
                                                                    setColumnFilterColumnId((current) => {
                                                                        if (current === columnId) {
                                                                            setClosingColumnId(columnId);
                                                                            return current;
                                                                        }
                                                                        setClosingColumnId(null);
                                                                        return columnId;
                                                                    });
                                                                }}
                                                                isFilterOpen={columnFilterColumnId === header.id}
                                                                isClosingColumnId={closingColumnId}
                                                                onCloseColumnFilter={() => {
                                                                    setColumnFilterColumnId(null);
                                                                    setClosingColumnId(null);
                                                                }}
                                                                onApplyColumnFilter={(colId, value) => {
                                                                    setColumnFilters((prev) => ({ ...prev, [colId]: value }));
                                                                }}
                                                                columnType={getColumnType(header.id, (dataTable[0] ?? fixedAssetsData?.fixedAssets?.[0])?.[header.id as keyof FixedAssets])}
                                                                columnFilterValue={columnFilters[header.id] ?? null}
                                                                onOpenManageFields={header.id === 'manage' ? (e) => {
                                                                    const el = e.currentTarget as HTMLElement;
                                                                    manageFieldsTriggerRef.current = el;
                                                                    const rect = el.getBoundingClientRect();
                                                                    setManageFieldsOpen(true);
                                                                    setManageFieldsTriggerRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
                                                                } : undefined}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                </tr>
                                            ))}         
                                        </thead>
                                        <tbody className="divide-y-2 divide-gabu-900/25 relative">
                                            {table.getRowModel().rows.map(row => (
                                                <tr key={row.id} data-rowid={row.id}>
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
                                </div>
                            </div>
                        </div>
                        <div className="w-full mt-1 px-1">
                            <div
                                ref={bottomScrollbarRef}
                                onScroll={syncFromBottomScrollbar}
                                className="w-full overflow-x-auto overflow-y-hidden table-scroll"
                            >
                                <div style={{ width: Math.max(table.getTotalSize(), 1), height: 1 }} />
                            </div>
                        </div>
                        {table.getCanNextPage() || table.getCanPreviousPage() ? (
                            <div className="mt-1.5 xl:mt-2 flex justify-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mt-1.5">
                                <nav className="flex gap-1 xl:gap-2 items-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                                    <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-1.5 xl:p-2 rounded-2xl inline-flex items-center justify-center [&_svg]:scale-90 xl:[&_svg]:scale-100 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1" onClick={() => table.getCanPreviousPage() && table.previousPage()}>
                                        <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-180" activeRotation="rotate-180" active={false} />
                                    </span>
                                    {getPaginationItems()}
                                    <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-1.5 xl:p-2 rounded-2xl inline-flex items-center justify-center [&_svg]:scale-90 xl:[&_svg]:scale-100 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1" onClick={() => table.getCanNextPage() && table.nextPage()}>
                                            <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-0" activeRotation="rotate-0" active={false} />
                                    </span>
                                </nav>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}

<div className="h-[88%] w-full pt-10 flex items-center flex-col relative">
                <div className="relative w-[95%] h-[75%] overflow-x-auto table-scroll">
                    <table className="border-collapse divide-y-2 divide-gabu-900/25 border-b-2 border-gabu-900/25 absolute h-full">
                    <thead>
                        <tr>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden z-50">
                            <div className="flex items-center gap-2">
                            <p className="cursor-pointer field-filter">Codigo</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                            <div className="absolute z-100 h-[9em] w-[20em] bg-gabu-700 top-10 rounded-2xl p-3 flex flex-col hidden filter-container">
                            <span className="absolute -top-1.5 start-5 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm"></span>
                            <p className="text-base text-gabu-100 text-center border-b border-gabu-100/25">Filtrar campo</p>
                            <div className="flex w-full gap-2 mt-2">
                                <div className="flex flex-col gap-1 w-[50%]">
                                <label htmlFor="empresa" className="text-gabu-100 text-xs font-normal">Condicion</label>
                                <div className="relative">
                                    <div className="bg-gabu-100 rounded-md font-normal px-3 py-0.5 flex gap-2 justify-between items-center cursor-pointer filter">
                                        <span className="text-sm text-gabu-900" id="select-value">Mayor que</span>
                                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-900 -rotate-90 transition-transform duration-300 select-pointer">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                        </svg>
                                    </div>
                                    <ul className="w-full rounded-b-md hidden absolute font-normal cursor-pointer border border-gabu-700 box-border bg-gabu-100 options-list">
                                        <li className="text-sm hover:bg-gabu-300 transition-all duration-300 option px-3">Menor que</li>
                                        <li className="text-sm hover:bg-gabu-300 transition-all duration-300 option px-3">Igual que</li>
                                        <li className="text-sm hover:bg-gabu-300 transition-all duration-300 option px-3">Mayor o igual</li>
                                        <li className="text-sm hover:bg-gabu-300 transition-all duration-300 option px-3">Menor o igual</li>
                                        <li className="text-sm hover:bg-gabu-300 transition-all duration-300 option px-3">Contiene</li>
                                    </ul>
                                </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[50%]">
                                <label htmlFor="valor-filtro" className="text-gabu-100 text-xs font-normal">Valor</label>
                                <input type="text" id="valor-filtro" className="bg-gabu-100 rounded-md font-normal px-3 text-gabu-700 focus:outline-none" placeholder="Valor..."/>
                                </div>
                            </div>
                            <div className="w-full flex justify-center mt-5">
                                <button className="font-normal text-sm text-gabu-900 px-10 py-0.5 bg-gabu-300 rounded-lg hover:bg-gabu-100 cursor-pointer transition-colors duration-300">Aplicar</button>
                            </div>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Descripcion</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Centro de costo</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Cuenta</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Fecha origen</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Valor actual</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Amortizacion acumulada</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Indice</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 px-4 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                            <div className="flex items-center gap-2">
                            <p>Fecha Actualizacion</p>
                            <svg width="8" height="15" viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full cursor-pointer">
                                <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
                                <g clipPath="url(#clip0_402_709)">
                                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_402_709">
                                <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                                </clipPath>
                                </defs>
                            </svg>
                            </div>
                        </th>
                        <th className="text-start py-2 text-gabu-900 sticky right-0 z-50 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Administrar campos" id="manage-fields-btn">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.8584 1.15765C15.863 0.157366 14.4573 0 12.7976 0H5.18367C3.54394 0 2.13828 0.156948 1.14244 1.15765C0.146606 2.15834 0 3.56083 0 5.19894V12.7718C0 14.4492 0.146189 15.8421 1.14202 16.8424C2.13786 17.8426 3.54352 18 5.21241 18H12.7972C14.4569 18 15.8626 17.8431 16.858 16.8424C17.8538 15.8421 18 14.4492 18 12.7718V5.22824C18 3.55078 17.8542 2.14788 16.8584 1.15765ZM16.4286 4.95368V13.0367C16.4286 14.0566 16.3015 15.0963 15.7164 15.6948C15.1208 16.2832 14.0662 16.4205 13.0608 16.4205H4.93919C3.93378 16.4205 2.87963 16.2832 2.29404 15.6948C1.69846 15.0963 1.57143 14.0566 1.57143 13.0363V4.9834C1.57143 3.95382 1.69846 2.89411 2.28405 2.30566C2.87963 1.70717 3.94336 1.57994 4.96835 1.57994H13.0608C14.0662 1.57994 15.1204 1.71722 15.716 2.30566C16.3015 2.90416 16.4286 3.94336 16.4286 4.95368ZM9.00042 14.2333C9.39109 14.2333 9.70346 13.929 9.70346 13.5368V9.70145H13.5202C13.9105 9.70145 14.2228 9.36788 14.2228 9.00502C14.2228 8.62249 13.9105 8.29855 13.5202 8.29855H9.70346V4.45354C9.70346 4.06096 9.39109 3.75711 9.00042 3.75711C8.90903 3.75576 8.81831 3.77285 8.73361 3.80737C8.64892 3.84189 8.57198 3.89314 8.50736 3.95808C8.44273 4.02302 8.39173 4.10033 8.35738 4.18544C8.32303 4.27054 8.30602 4.36171 8.30737 4.45354V8.29855H4.49063C4.09996 8.29855 3.78759 8.62249 3.78759 9.00502C3.78759 9.36788 4.09996 9.70145 4.49063 9.70145H8.30737V13.5368C8.30737 13.929 8.61016 14.2333 9.00042 14.2333Z" fill="#071739"/>
                                </svg>
                            </div>
                        </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gabu-900/25">
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="px-4 flex justify-center cursor-pointer" title="Acciones">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                            </svg>
                            </div>
                        </td>
                        </tr>
                        <tr>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">001001-001-0-0</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">Tanque de Almacenaje</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1152</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">230101</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2025</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">1,195.93</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">7.4367</td>
                        <td className="py-2 px-4 text-gabu-900 text-sm whitespace-nowrap">01/01/2026</td>
                        <td className="py-2 text-gabu-900 text-sm sticky right-0 z-10 bg-gabu-100">
                            <div className="fixed w-[13em] h-[14em] bg-gabu-700 right-30 rounded-xl flex flex-col hidden field-actions">
                            <span className="absolute top-2 -end-1.5 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm"></span>
                            <p className="text-lg text-gabu-100 w-full text-center p-1 border-2 border-gabu-100/20">Acciones</p>
                            <div className="flex flex-col w-full gap-1 mt-1">
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Modificar</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Consultar</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Clonar</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Alta agregado</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3 btn-remove-fixed-asset">
                                    <p className="text-gabu-100">Baja</p>
                                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                    </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Baja fisica</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Apertura de bienes</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-3">
                                <p className="text-gabu-100">Transferencia</p>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                </svg>
                                </div>
                            </div>
                            </div>
                            <div className="px-4 flex justify-center cursor-pointer field-actions-button" title="Acciones">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full hover:bg-gabu-300 transition-colors durarion-100">
                                    <path d="M12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12C14 11.4696 13.7893 10.9609 13.4142 10.5858C13.0391 10.2107 12.5304 10 12 10C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14ZM6 14C6.53043 14 7.03914 13.7893 7.41421 13.4142C7.78929 13.0391 8 12.5304 8 12C8 11.4696 7.78929 10.9609 7.41421 10.5858C7.03914 10.2107 6.53043 10 6 10C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12C4 12.5304 4.21071 13.0391 4.58579 13.4142C4.96086 13.7893 5.46957 14 6 14ZM18 14C18.5304 14 19.0391 13.7893 19.4142 13.4142C19.7893 13.0391 20 12.5304 20 12C20 11.4696 19.7893 10.9609 19.4142 10.5858C19.0391 10.2107 18.5304 10 18 10C17.4696 10 16.9609 10.2107 16.5858 10.5858C16.2107 10.9609 16 11.4696 16 12C16 12.5304 16.2107 13.0391 16.5858 13.4142C16.9609 13.7893 17.4696 14 18 14Z" fill="black"/>
                                </svg>
                            </div>
                        </td>
                        </tr>
                    </tbody>
                    </table>
                </div>
                <div className="mt-5">
                    <nav className="flex gap-2 items-center">
                    <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-2 rounded-2xl">
                        <svg width="15" height="20" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-700 rotate-180 h-full">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                        </svg>
                    </span>
                    <span className="text-gabu-900 text-xl cursor-pointer p-2">1</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">2</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">3</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">4</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">5</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">6</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">7</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">8</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">9</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">10</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2 pb-4">...</span>
                    <span className="text-gabu-700 cursor-pointer hover:bg-gabu-300 rounded-2xl transition-colors duration-150 p-2">24</span>
                    <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-2 rounded-2xl">
                        <svg width="15" height="20" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-700 h-full">
                        <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                        </svg>
                    </span>
                    </nav>
                </div>
</div>