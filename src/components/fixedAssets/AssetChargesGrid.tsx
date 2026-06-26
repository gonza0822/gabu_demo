'use client';

import React, { useEffect, useMemo, useState } from "react";
import { ConverFieldModel } from "@/generated/prisma/models";
import { InvestmentsData } from "@/lib/models/investments/Investments";
import { ChargeRowData, getRowValueByField, normalizeChargeCellValue } from "@/lib/investments/chargesRowUtils";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingFnOption,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { formatNumericDisplayValue, isLikelyNumericField } from "@/util/number/formatNumberEs";

function formatCellDisplay(
    value: unknown,
    field: Pick<ConverFieldModel, "IdCampo" | "BrowNombre">
): string {
    const raw = normalizeChargeCellValue(value, { dateOnly: true });
    const formatted = formatNumericDisplayValue(raw, field.IdCampo, {
        parseNumericStrings: isLikelyNumericField(field.IdCampo, field.BrowNombre ?? undefined),
    });
    if (formatted == null || formatted === "") return "";
    return String(formatted);
}

export default function AssetChargesGrid({
    client,
    bienId,
    enabled,
}: {
    client: string;
    bienId?: string;
    enabled: boolean;
}): React.ReactElement {
    const [fields, setFields] = useState<ConverFieldModel[]>([]);
    const [rows, setRows] = useState<ChargeRowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);

    useEffect(() => {
        if (!enabled || !client || !bienId) return;
        let ignore = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const response = await fetch("/api/investments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "GetByBien",
                        client,
                        data: { type: "charges", bienId },
                    }),
                });
                const json = (await response.json()) as InvestmentsData & { message?: string };
                if (!response.ok) throw new Error(json.message ?? "Error al cargar cargos del bien");
                if (ignore) return;
                setFields(json.fieldsManage ?? []);
                setRows((json.table ?? []) as ChargeRowData[]);
            } catch (err) {
                if (!ignore) {
                    setFields([]);
                    setRows([]);
                    setError(err instanceof Error ? err.message : "Error al cargar cargos");
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [enabled, client, bienId]);

    const columnHelper = createColumnHelper<ChargeRowData>();

    const columns = useMemo(
        () =>
            fields
                .filter((f) => f.listShow !== false)
                .map((field) =>
                    columnHelper.accessor((row) => getRowValueByField(row, field.IdCampo), {
                        id: field.IdCampo,
                        size: 120,
                        header: field.BrowNombre ?? field.IdCampo,
                        cell: (info) => formatCellDisplay(info.getValue(), field),
                        sortingFn: "myCustomSorting" as SortingFnOption<ChargeRowData>,
                    })
                ),
        [fields, columnHelper]
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        sortingFns: {
            myCustomSorting: (rowA, rowB, columnId) => {
                const fieldMeta = fields.find((f) => f.IdCampo === columnId) ?? { IdCampo: columnId, BrowNombre: null };
                const a = formatCellDisplay(rowA.getValue(columnId), fieldMeta);
                const b = formatCellDisplay(rowB.getValue(columnId), fieldMeta);
                const na = Number(String(a).replace(/\./g, "").replace(",", "."));
                const nb = Number(String(b).replace(/\./g, "").replace(",", "."));
                if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
                return String(a).localeCompare(String(b), "es");
            },
        },
    });

    if (!bienId) {
        return (
            <p className="text-center text-sm text-gabu-700">
                Guarde el bien para ver los cargos asociados.
            </p>
        );
    }

    if (error) {
        return <p className="text-center text-sm text-gabu-error">{error}</p>;
    }

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            <div className="asset-charges-scroll min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto overscroll-contain rounded-md border border-gabu-900/30 bg-gabu-100">
                {loading ? (
                    <Skeleton
                        count={4}
                        height={14}
                        highlightColor="var(--color-gabu-700)"
                        baseColor="var(--color-gabu-300)"
                        className="m-2"
                    />
                ) : rows.length === 0 ? (
                    <p className="p-4 text-center text-xs text-gabu-700">Este bien no tiene cargos asociados.</p>
                ) : (
                    <table className="w-max border-collapse divide-y-2 divide-gabu-900/25">
                        <thead className="sticky top-0 z-10 bg-gabu-300">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="cursor-pointer whitespace-nowrap px-1.5 py-1 text-left text-[11px] font-semibold text-gabu-900"
                                            style={{ minWidth: header.column.getSize() }}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{
                                                    asc: " ↑",
                                                    desc: " ↓",
                                                }[header.column.getIsSorted() as string] ?? null}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y-2 divide-gabu-900/25 bg-gabu-100">
                            {table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="text-gabu-900">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="max-w-[10rem] truncate whitespace-nowrap px-1.5 py-1 text-[11px]">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
