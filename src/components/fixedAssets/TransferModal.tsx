'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, flexRender, SortingFnOption, SortingState } from "@tanstack/react-table";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Cross from "../svg/Cross";
import Order from "../svg/table/Order";
import Checked from "../svg/Checked";
import Percentage from "../svg/Percentage";
import { FixedAssets, type LibroAccordionData } from "@/lib/models/fixedAssets/FixedAsset";
import { getLibrosFormDataCached, getLibrosFormDataFromCache } from "@/lib/cache/librosFormCache";
import { parseStringDate, parseDateString } from "@/util/date/parseDate";
import { formatNumberEs } from "@/util/number/formatNumberEs";

type FieldMeta = { IdCampo: string; BrowNombre: string | null };

type TransferRow = FixedAssets & { _rowId: string };

function findBrowNombre(fieldsManage: FieldMeta[], pattern: string | RegExp, prefix?: string): string {
    const f = fieldsManage.find((fm) => {
        const id = (fm.IdCampo ?? '').toLowerCase();
        if (prefix && !id.startsWith(prefix.toLowerCase())) return false;
        if (typeof pattern === 'string') return id.includes(pattern.toLowerCase());
        return pattern.test(id);
    });
    return f?.BrowNombre ?? '';
}

/** Busca BrowNombre por IdCampo exacto (evita que cabecera.idDescripcion coincida al buscar descripcion) */
function findBrowNombreExact(fieldsManage: FieldMeta[], idCampo: string): string {
    const want = idCampo.toLowerCase();
    const f = fieldsManage.find((fm) => (fm.IdCampo ?? '').toLowerCase() === want);
    return f?.BrowNombre ?? '';
}

function getRowVal(row: FixedAssets, key: string): unknown {
    const r = row as Record<string, unknown>;
    if (r[key] !== undefined) return r[key];
    const lower = key.toLowerCase();
    if (r[lower] !== undefined) return r[lower];
    const matchedKey = Object.keys(r).find((k) => k.toLowerCase() === lower);
    return matchedKey != null ? r[matchedKey] : undefined;
}

function getMonedaLocalVal(row: FixedAssets, field: string): unknown {
    const r = row as Record<string, unknown>;
    const base = field.charAt(0).toUpperCase() + field.slice(1).toLowerCase();
    const variants = [
        `monedalocal.${field}`,
        `monedalocal.${base}`,
        `MONEDALOCAL.${field.toUpperCase()}`,
        `me01.${field}`,
        `me01.${base}`,
        `me03.${field}`,
        `me03.${base}`,
        `ME03.${field}`,
    ];
    for (const k of variants) {
        if (r[k] !== undefined) return r[k];
    }
    const key = Object.keys(r).find((k) => {
        const lower = k.toLowerCase();
        return (lower.includes('monedalocal') || lower.includes('me01') || lower.includes('me03')) && lower.includes(field.toLowerCase());
    });
    return key != null ? r[key] : undefined;
}

function getBienCodigo(row: FixedAssets): string {
    const parts = ['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].map((key) => {
        let v = getRowVal(row, key);
        if (v == null || v === '') v = getRowVal(row, `cabecera.${key}`);
        if (v == null || v === '') v = getRowVal(row, `cabesimu.${key}`);
        if (v == null || v === '') v = getRowVal(row, key.toLowerCase());
        return String(v ?? '').trim();
    });
    return parts.join('-');
}

function toComparableDate(val: unknown): number | null {
    if (val == null) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
    const s = String(val).trim();
    if (!s) return null;
    if (/^\d{1,2}\/\d{4}$/.test(s)) return parseDateString(s).getTime();
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.getTime();
}

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

function formatCellValue(value: unknown, columnId: string): React.ReactNode {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && !isNaN(value)) {
        const isIndice = columnId.toLowerCase().includes('indice');
        if (isIndice) return formatNumberEs(value, 7, 7);
        return formatNumberEs(value, 2, 2);
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            const isIndice = columnId.toLowerCase().includes('indice');
            if (isIndice) return formatNumberEs(parsed, 7, 7);
            return formatNumberEs(parsed, 2, 2);
        }
    }
    return formatCellDate(value);
}

const DATE_FORMAT_MSG = "El formato de la fecha es inválido. Utilice MM/YYYY.";

function validateFechaMMYYYY(value: string): string | null {
    const s = value.trim();
    if (s === "") return DATE_FORMAT_MSG;
    if (!/^\d{1,2}\/\d{4}$/.test(s)) return DATE_FORMAT_MSG;
    const [monthStr] = s.split("/");
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) return DATE_FORMAT_MSG;
    return null;
}

export default function TransferModal({
    isOpen,
    onClose,
    assets,
    fieldsManage,
    cuentasDestinoOptions = [],
    fecproTransferenciaDefault = '',
    client = '',
    simulationOnly = false,
    onSuccess,
    onError,
}: {
    isOpen: boolean;
    onClose: () => void;
    assets: FixedAssets[];
    fieldsManage: FieldMeta[];
    cuentasDestinoOptions?: { key: string; value: string }[];
    fecproTransferenciaDefault?: string;
    client?: string;
    simulationOnly?: boolean;
    onSuccess?: () => void;
    onError?: (message: string) => void;
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [fechaTransferencia, setFechaTransferencia] = useState('');
    const [fechaTransferenciaError, setFechaTransferenciaError] = useState<string | null>(null);
    const [cuentaDestino, setCuentaDestino] = useState('');
    const [porcentajeTransferencia, setPorcentajeTransferencia] = useState('100');
    const [porcentajeTransferenciaError, setPorcentajeTransferenciaError] = useState<string | null>(null);
    const [librosContables, setLibrosContables] = useState<LibroAccordionData[]>([]);
    const [librosLoading, setLibrosLoading] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);

    const fetchLibrosData = useCallback(async () => {
        if (!client) return;
        const fromCache = getLibrosFormDataFromCache(client, simulationOnly);
        if (fromCache) {
            setLibrosContables(fromCache);
            return;
        }
        setLibrosLoading(true);
        try {
            const acordeones = await getLibrosFormDataCached(client, simulationOnly);
            setLibrosContables(acordeones);
        } finally {
            setLibrosLoading(false);
        }
    }, [client, simulationOnly]);

    useEffect(() => {
        if (isOpen && client) fetchLibrosData();
    }, [isOpen, client, fetchLibrosData]);

    const dataWithIds = useMemo(() => {
        return assets.map((a, idx) => ({ ...a, _rowId: String(idx) }));
    }, [assets]);

    useEffect(() => {
        setSelectedIds(new Set(dataWithIds.map((r) => r._rowId)));
    }, [dataWithIds]);

    useEffect(() => {
        if (isOpen && fecproTransferenciaDefault) {
            setFechaTransferencia(fecproTransferenciaDefault);
            setFechaTransferenciaError(null);
        }
    }, [isOpen, fecproTransferenciaDefault]);

    // Al abrir el modal, resetear valores del formulario para no arrastrar datos de otra transferencia
    useEffect(() => {
        if (isOpen) {
            setPorcentajeTransferencia('100');
            setCuentaDestino(cuentasDestinoOptions[0]?.key ?? '');
            setFechaTransferenciaError(null);
            setPorcentajeTransferenciaError(null);
        }
    }, [isOpen, cuentasDestinoOptions]);

    useEffect(() => {
        if (cuentasDestinoOptions.length > 0 && !cuentaDestino && cuentasDestinoOptions[0]?.key) {
            setCuentaDestino(cuentasDestinoOptions[0].key);
        }
    }, [cuentasDestinoOptions, cuentaDestino]);

    const columnHelper = createColumnHelper<TransferRow>();

    const toggleSelect = (rowId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) next.delete(rowId);
            else next.add(rowId);
            return next;
        });
    };

    const headerDescripcion = findBrowNombreExact(fieldsManage, 'cabecera.descripcion') || findBrowNombre(fieldsManage, 'descripcion', 'cabecera') || findBrowNombre(fieldsManage, 'descripcion') || 'Descripcion';
    const headerValorActual = findBrowNombre(fieldsManage, 'vrepoeactual', 'monedalocal') || findBrowNombre(fieldsManage, 'vrepoeactual') || 'Valor actual';

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'seleccionar',
            header: 'Seleccionar',
            size: 80,
            cell: ({ row }) => {
                const id = row.original._rowId;
                return (
                    <div className="relative flex justify-center items-center w-full min-w-[40px] py-2">
                        <input
                            type="checkbox"
                            className="peer checked:bg-gabu-900 appearance-none w-4 h-4 min-w-[16px] min-h-[16px] bg-gabu-300 border border-gabu-900 cursor-pointer rounded-md focus:outline-none"
                            checked={selectedIds.has(id)}
                            onChange={() => toggleSelect(id)}
                        />
                        <Checked style="absolute w-4 h-4 min-w-[16px] min-h-[16px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gabu-100 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                );
            },
        }),
        columnHelper.accessor((row) => getBienCodigo(row), {
            id: 'codigo',
            header: 'Codigo',
            size: 130,
            cell: (info) => info.getValue(),
            sortingFn: 'myCustomSorting' as SortingFnOption<TransferRow>,
        }),
        columnHelper.accessor((row) => {
            const v = getRowVal(row, 'descripcion') ?? getRowVal(row, 'cabecera.descripcion');
            return String(v ?? '');
        }, { id: 'descripcion', header: headerDescripcion, size: 200, cell: (info) => info.getValue(), sortingFn: 'myCustomSorting' as SortingFnOption<TransferRow> }),
        columnHelper.accessor((row) => {
            const v = getMonedaLocalVal(row, 'vrepoeactual');
            const n = typeof v === 'number' ? v : (v != null && v !== '' ? parseFloat(String(v)) : null);
            return n;
        }, { id: 'valorActual', header: headerValorActual, size: 110, cell: (info) => formatCellValue(info.getValue(), 'valorActual'), sortingFn: 'myCustomSorting' as SortingFnOption<TransferRow> }),
    ], [columnHelper, selectedIds, headerDescripcion, headerValorActual]);

    const table = useReactTable({
        columns,
        data: dataWithIds,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        columnResizeMode: 'onChange',
        state: { sorting },
        sortingFns: {
            myCustomSorting: (rowA, rowB, columnId) => {
                const rowAValue = rowA.getValue(columnId);
                const rowBValue = rowB.getValue(columnId);
                if (rowAValue == null && rowBValue == null) return 0;
                if (rowAValue == null) return -1;
                if (rowBValue == null) return 1;
                const a = String(rowAValue).toLowerCase().trim();
                const b = String(rowBValue).toLowerCase().trim();
                if (!isNaN(Number(a)) && !isNaN(Number(b))) return Number(a) - Number(b);
                const aDate = toComparableDate(rowAValue);
                const bDate = toComparableDate(rowBValue);
                if (aDate != null && bDate != null) return aDate - bDate;
                if (a === "true" || a === "false") return (a === "true" ? 1 : 0) - (b === "true" ? 1 : 0);
                return a.localeCompare(b);
            },
        },
    });

    const handleSelectCuentaDestino = (e: React.MouseEvent<HTMLLIElement>, _ref: React.RefObject<HTMLSpanElement | null>) => {
        const key = e.currentTarget.dataset.key ?? '';
        setCuentaDestino(key);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        const err = validateFechaMMYYYY(fechaTransferencia);
        if (err) {
            setFechaTransferenciaError(err);
            return;
        }
        setFechaTransferenciaError(null);
        const pctTrans = parseFloat(String(porcentajeTransferencia).replace(',', '.'));
        if (Number.isNaN(pctTrans) || pctTrans < 0 || pctTrans > 100) {
            setPorcentajeTransferenciaError('El porcentaje debe estar entre 0 y 100');
            return;
        }
        setPorcentajeTransferenciaError(null);
        if (!client) {
            onError?.('Cliente no seleccionado');
            return;
        }
        if (!cuentaDestino.trim()) {
            onError?.('Seleccione una cuenta destino');
            return;
        }
        const selected = dataWithIds.filter((r) => selectedIds.has(r._rowId));
        if (selected.length === 0) {
            onError?.('No hay bienes seleccionados');
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/fixedAssets/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    petition: 'Transfer',
                    client,
                    data: {
                        selectedAssets: selected.map(({ _rowId, ...a }) => a),
                        fechaTransferencia,
                        cuentaDestino,
                        porcentajeTransferencia,
                        simulationOnly,
                    },
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const msg = json?.message ?? `Error ${res.status}`;
                throw new Error(msg);
            }
            onSuccess?.();
            onClose();
        } catch (e) {
            onError?.(e instanceof Error ? e.message : String(e));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            style="asset-modal-scroll w-[92vw] sm:w-[88vw] lg:w-[76vw] xl:w-[62vw] 2xl:w-[50vw] min-w-[320px] max-w-[1400px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gabu-100 border border-gabu-900 rounded-2xl p-4 max-h-[90vh] overflow-y-auto"
        >
            <div className="flex justify-end -mt-1 -mr-1">
                <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gabu-300 transition-colors" aria-label="Cerrar">
                    <Cross style="h-5 w-5 fill-current text-gabu-900 cursor-pointer" onClick={onClose} />
                </button>
            </div>
            <p className="font-semibold text-gabu-900 w-full text-center text-2xl mt-1">
                Transferencia bien{assets.length > 0 ? ` ${getBienCodigo(assets[0])}` : ''}
            </p>

            <div className="p-5 bg-gabu-500 flex rounded-md border border-gabu-900 mt-3">
                <div className="bg-gabu-100 border border-gabu-900 p-3 overflow-auto flex-1 max-h-[14rem] transfer-modal-table-scroll">
                    <table className="border-collapse divide-y-2 divide-gabu-900/25 table-fixed w-full" style={{ minWidth: table.getTotalSize() }}>
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="text-start py-2 px-2 text-gabu-900 whitespace-nowrap overflow-x-hidden relative"
                                            style={{ width: header.getSize() }}
                                        >
                                            <div
                                                className="flex items-center gap-2 cursor-pointer min-w-0"
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <p className="text-sm text-ellipsis overflow-hidden">{header.column.columnDef.header as string}</p>
                                                {header.id !== 'seleccionar' && (
                                                    <Order style="h-[15px] w-[8px] shrink-0 cursor-pointer" />
                                                )}
                                            </div>
                                            <div
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                                onClick={(e) => e.stopPropagation()}
                                                onDoubleClick={() => header.column.resetSize()}
                                                className="absolute top-0 right-0 h-full w-[5px] cursor-col-resize"
                                            />
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y-2 divide-gabu-900/25">
                            {table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={selectedIds.has(row.original._rowId) ? 'border-2 border-gabu-900 bg-gabu-900/25' : ''}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={`py-2 px-2 text-gabu-900 text-xs whitespace-nowrap overflow-hidden text-ellipsis ${['valorActual'].includes(cell.column.id) ? 'text-right' : ''}`}
                                            style={{ width: cell.column.getSize() }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex gap-2 w-full px-5">
                <div className="flex flex-col w-[50%] gap-3 p-3 pt-5">
                    <Input
                        label="Fecha de transferencia"
                        hasLabel={true}
                        isLogin={false}
                        disabled={true}
                        type="text"
                        isError={!!fechaTransferenciaError}
                        errorMessage={fechaTransferenciaError}
                        value={fechaTransferencia}
                        placeholder="MM/YYYY"
                        handleInput={(e) => {
                            setFechaTransferencia(e.currentTarget.value);
                            setFechaTransferenciaError(null);
                        }}
                    />
                    <div className="w-full min-w-0">
                        <Select
                            label="Cuenta destino"
                            hasLabel={true}
                            isLogin={false}
                            variant="default"
                            options={cuentasDestinoOptions.length > 0 ? cuentasDestinoOptions : [{ key: '', value: '-' }]}
                            defaultValue={cuentaDestino}
                            chooseOptionHandler={handleSelectCuentaDestino}
                            controlClassName="min-h-[42px]"
                        />
                    </div>
                    <div className="flex flex-col gap-1 w-full relative">
                        <label className="text-gabu-900 text-lg">Porcentaje transferencia</label>
                        <div className={`flex rounded-md border items-center w-full py-2 pl-3 pr-2 min-h-[42px] ${porcentajeTransferenciaError ? 'border-2 border-gabu-error' : 'border border-gabu-900'}`}>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                className="text-gabu-900 outline-none focus:outline-none focus:ring-0 flex-1 min-w-0 bg-transparent"
                                value={porcentajeTransferencia}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw.startsWith('-')) {
                                        setPorcentajeTransferencia('0');
                                        setPorcentajeTransferenciaError(null);
                                        return;
                                    }
                                    if (raw === '') {
                                        setPorcentajeTransferencia(raw);
                                        setPorcentajeTransferenciaError(null);
                                        return;
                                    }
                                    const num = parseFloat(raw.replace(',', '.'));
                                    if (!Number.isNaN(num)) {
                                        if (num > 100) setPorcentajeTransferencia('100');
                                        else setPorcentajeTransferencia(raw);
                                    } else {
                                        setPorcentajeTransferencia(raw);
                                    }
                                    setPorcentajeTransferenciaError(null);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                            />
                            <div className="flex border-l border-l-gabu-900 justify-center items-center pl-2 shrink-0">
                                <Percentage style="w-4 h-4" />
                            </div>
                        </div>
                        {porcentajeTransferenciaError && (
                            <p className="text-gabu-error text-sm mt-0.5">{porcentajeTransferenciaError}</p>
                        )}
                    </div>
                </div>
                <div className="flex w-[50%] p-3 pt-7">
                    <div className="h-full w-full flex flex-col rounded-md bg-gabu-500 border border-gabu-900 overflow-hidden">
                        <p className="w-full py-1 text-center rounded-t-md bg-gabu-100 border-b border-b-gabu-900">Aplicar a</p>
                        <div className="flex flex-col w-full gap-2 p-3 overflow-y-auto max-h-[14rem]">
                            {librosLoading ? (
                                <div className="flex flex-col gap-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 bg-gabu-300 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                librosContables.map((acordeon) => (
                                    <div
                                        key={acordeon.prefijo}
                                        className="w-full border border-gabu-900 flex justify-between px-3 py-0.5 rounded-lg bg-gabu-100"
                                    >
                                        <p className="text-gabu-900 font-medium">{acordeon.nombre}</p>
                                        <div className="py-1 px-1 flex justify-center relative">
                                            <input
                                                type="checkbox"
                                                checked={true}
                                                disabled
                                                readOnly
                                                className="peer checked:bg-gabu-900 appearance-none text-center bg-gabu-300 w-4 h-4 border border-gabu-900 rounded-md focus:outline-none cursor-not-allowed opacity-100"
                                            />
                                            <Checked style="absolute w-4 h-4 text-gabu-100 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                    </div>
                                ))
                            )}
                            {!librosLoading && librosContables.length === 0 && (
                                <p className="text-gabu-700 text-sm">No hay libros contables</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full flex justify-end gap-5 px-8 py-4">
                <button
                    type="button"
                    className="font-normal text-gabu-100 w-[20%] py-1 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300"
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="font-normal text-gabu-100 w-[20%] py-1 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Procesando...' : 'Confirmar'}
                </button>
            </div>
        </Modal>
    );
}
