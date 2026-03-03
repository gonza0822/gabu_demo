import React from "react";
import { Cell, flexRender } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { relative } from "path";

export default function DraggableCell<TData>({cell, index}: {cell: Cell<TData, unknown>, index: number}) : React.ReactElement  {
    const {setNodeRef, isDragging, transform, transition} = useSortable({ id: cell.column.id });

    const style: React.CSSProperties = {
        width: cell.column.getSize(),
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 0,
        transition: transition,
    };

    return (
        <td ref={setNodeRef} key={cell.id} className={`${cell.column.id === 'manage' ? 'text-sm sticky right-0 z-10 bg-gabu-100' : 'px-2 text-xs whitespace-nowrap text-ellipsis overflow-hidden relative'} py-2 text-gabu-900 ${index === 0 && cell.column.id === 'get' ? 'flex justify-center' : ''}`} style={style}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
    );
}