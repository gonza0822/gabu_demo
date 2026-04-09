'use client';

import { createColumnHelper, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingFnOption, SortingState } from "@tanstack/react-table";
import React, { useEffect, useMemo, useState } from "react";
import { FieldsWithRelation } from "@/lib/models/tables/Table";
import Search from "../svg/Search";
import Excel from "../svg/Excel";
import Arrow from "../svg/Arrow";
import Checked from "../svg/Checked";
import { DndContext, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import DraggableCell from "./DraggableCell";
import DraggableHeader from "./DraggableHeader";
import ExcelJS from "exceljs";

type SecondaryExportPayload = {
    sheetName: string;
    rows: Record<string, unknown>[];
    fields: FieldsWithRelation[];
};

export default function MainTable<TData>({
    data,
    fields,
    client,
    connPath,
    onRowSelect,
    record,
    getSecondaryExportData,
}: {
    data: TData[],
    fields: FieldsWithRelation[],
    client: string,
    connPath: string,
    onRowSelect: React.Dispatch<React.SetStateAction<TData | null>>,
    record: TData | null,
    getSecondaryExportData?: () => SecondaryExportPayload | null,
}) : React.ReactElement {

    const columnHelper = createColumnHelper<TData>();

    const [dataTable, setDataTable] = React.useState<TData[]>(data);

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 6,
    });

    const [sorting, setSorting] = useState<SortingState>([]);

    const [columnOrder, setColumnOrder] = useState<string[]>([
        'get',
        ...fields.map(field => field.IdCampo)
    ]);

    const [selectedRow, setSelectedRow] = useState<string | null>(null);

    useEffect(() => {
        setDataTable(data);
    }, [data]);

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'get',
            header: 'Seleccionar',
            cell: ({row}) => (
                <>
                    <input type="checkbox" className="peer checked:bg-gabu-900 appearance-none text-center bg-gabu-300 w-4 h-4 border border-gabu-900 cursor-pointer rounded-md focus:outline-none" onChange={handleChooseRow} checked={selectedRow === row.id}/>
                    <Checked style="absolute w-4 h-4 text-gabu-100 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"/>
                </>
            ),
        }),
        ...fields.map(field => columnHelper.accessor((row: TData) => row[field.IdCampo as keyof TData], {
            id: field.IdCampo,
            header: field.BrowNombre ?? '',
            cell: info => info.getValue(),
            sortingFn: "myCustomSorting" as SortingFnOption<TData>,
        }))
    ], [fields, columnHelper]);

    useEffect(() => {
        if(record){
            const idFieldName = fields.find(field => field.relation?.[0]?.description === 'id')?.IdCampo;

            if(idFieldName){
                const recordId = record[idFieldName as keyof TData];

                const targetRow = table.getRowModel().rows.find(row => row.getValue(idFieldName) == recordId);

                if(targetRow){
                    setSelectedRow(targetRow.id);
                }
            }
        } else {
            setSelectedRow(null);
        }
    }, [record, dataTable]);

    const table = useReactTable({
        columns,
        data: dataTable,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onColumnOrderChange: setColumnOrder,
        state: {
            pagination,
            sorting,
            columnOrder,
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

                const aDate = Date.parse(a);
                const bDate = Date.parse(b);

                if(!isNaN(aDate) && !isNaN(bDate)) {
                    return aDate - bDate;
                }

                if(a === "true" || a === "false") {
                    return (a === "true" ? 1 : 0) - (b === "true" ? 1 : 0);
                }

                return a.localeCompare(b);
            },
        },
    });

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
                return <span key={`dots-${index}`} className="text-gabu-700 text-xs px-2">...</span>;
            }

            const isActive = page === currentPage;

            return (
                <span
                    key={page}
                    className={`${
                        isActive 
                            ? "text-gabu-900 font-bold bg-gabu-200" 
                            : "text-gabu-700 text-xs hover:bg-gabu-300 transition-colors duration-150"
                    } cursor-pointer p-2 rounded-2xl min-w-[32px] text-center`}
                    onClick={() => table.setPageIndex(Number(page) - 1)}
                >
                    {page}
                </span>
            );
        });
    }

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    function handleSearch(event: React.FormEvent<HTMLInputElement>) {
        const value = event.currentTarget.value.toLowerCase();
        const filteredData = data.filter((item) => {
            return fields.some((field) => {
                const fieldValue = item[field.IdCampo as keyof TData];
                return fieldValue && fieldValue.toString().toLowerCase().includes(value);
            });
        });
        setDataTable(filteredData);
    }

    function handleChooseRow(event: React.ChangeEvent<HTMLInputElement>) {
        const checkbox = event.currentTarget;
        const tableRow = checkbox.closest('tr');
        if(selectedRow === tableRow?.getAttribute('data-rowid')) {
            setSelectedRow(null);
            onRowSelect(null);
        } else {
            setSelectedRow(tableRow?.getAttribute('data-rowid') || null);
            const rowData = dataTable.find((_, index) => `${index}` === tableRow?.getAttribute('data-rowid'));
            onRowSelect(rowData || null);
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            const oldIndex = columnOrder.indexOf(active.id as string)
            const newIndex = columnOrder.indexOf(over.id as string)
            const newOrder = arrayMove(columnOrder, oldIndex, newIndex)

            setColumnOrder(newOrder);

            await changeOrder(newOrder);
        }
    }

    async function changeOrder(newOrder: string[]) {
        const updatedOrder = newOrder.map((columnId, index) => ({
            tableId: fields[0]?.IdTabla,
            fieldId: columnId,
            order: index
        })).filter(item => item.fieldId !== 'get');

        const data = await fetch(connPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                petition: 'UpdateOrder',
                client: client,
                data: updatedOrder
            }),
        });
        return data.json();
    }

    async function exportToExcel() {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(fields[0]?.IdTabla || "Data");

        const visibleColumns = table.getVisibleFlatColumns().filter(col => col.id !== 'get');

        worksheet.columns = visibleColumns.map(col => ({ header: col.columnDef.header as string, key: col.id, width: 20 }));

        const rows = table.getPrePaginationRowModel().rows;

        rows.forEach(row => {
            const rowData: { [key: string]: unknown } = {};
            visibleColumns.forEach(col => {
                rowData[col.id] = row.getValue(col.id);
            });
            worksheet.addRow(rowData);
        });

        const secondaryExport = getSecondaryExportData?.() ?? null;
        if (secondaryExport && secondaryExport.rows.length > 0) {
            const safeSheetName = (secondaryExport.sheetName || "Secundaria").slice(0, 31);
            const secondaryWorksheet = workbook.addWorksheet(safeSheetName);
            const visibleSecondaryFields = secondaryExport.fields.filter((field) => !field.options?.hidden);

            secondaryWorksheet.columns = visibleSecondaryFields.map((field) => ({
                header: field.BrowNombre ?? field.IdCampo,
                key: field.IdCampo,
                width: 20,
            }));

            secondaryExport.rows.forEach((row) => {
                const rowData: { [key: string]: unknown } = {};
                visibleSecondaryFields.forEach((field) => {
                    const rawValue = row[field.IdCampo];
                    if (field.relation.length > 0) {
                        const relationValue = field.relation.find((rel) => rel.id === String(rawValue))?.description;
                        rowData[field.IdCampo] = relationValue ?? rawValue;
                    } else {
                        rowData[field.IdCampo] = rawValue;
                    }
                });
                secondaryWorksheet.addRow(rowData);
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fields[0]?.IdTabla}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="bg-gabu-100 border border-gabu-900 p-3 w-full">
            <div className="flex w-full justify-between mb-2">
                <div className="flex bg-gabu-500 rounded-md my-0.5 px-3 gap-2 items-center">
                    <Search style="h-[15px] w-[15px] stroke-gabu-100"/>
                    <input type="text" placeholder="Buscar..." className="focus:outline-none text-gabu-100 w-full flex items-center text-sm" onInput={handleSearch}/>
                </div>
                <div className="bg-gabu-500 rounded-md p-1.5 cursor-pointer hover:bg-gabu-300 transition-colors duration-100">
                    <Excel style="fill-current text-gabu-100 h-[20px] w-[20px]" onClick={exportToExcel}/>
                </div>
            </div>
            <div className="w-full overflow-auto table-container grid">
                <div className="min-w-full">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
                        <table className="border-collapse divide-y-2 divide-gabu-900/25 table-fixed w-full" {...{style: {minWidth: table.getTotalSize()}}}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    <SortableContext key={headerGroup.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {headerGroup.headers.map(header => (
                                            <DraggableHeader key={header.id} header={header} />
                                        ))}
                                    </SortableContext>
                                </tr>
                            ))}         
                        </thead>
                        <tbody className="divide-y-2 divide-gabu-900/25 relative">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} data-rowid={row.id} className={`${selectedRow === row.id ? 'outline-2 outline-gabu-900 bg-gabu-900/25' : ''}`}>
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
            {table.getCanNextPage() || table.getCanPreviousPage() ? (
                <div className="mt-2 flex justify-center">
                    <nav className="flex gap-2 items-center">
                        <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-2 rounded-2xl" onClick={() => table.getCanPreviousPage() && table.previousPage()}>
                            <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-180" activeRotation="rotate-180" active={false} />
                        </span>
                        {getPaginationItems()}
                        <span className="hover:bg-gabu-300 transition-colors duration-150 cursor-pointer p-2 rounded-2xl" onClick={() => table.getCanNextPage() && table.nextPage()}>
                                <Arrow height={20} width={15} color="text-gabu-700" defaultRotation="rotate-0" activeRotation="rotate-0" active={false} />
                        </span>
                    </nav>
                </div>
            ) : null}
        </div>

    );
}