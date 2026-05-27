import React from "react";
import { Cell, flexRender } from "@tanstack/react-table";
import { formatNumericDisplayValue } from "@/util/number/formatNumberEs";

export default function DraggableCell<TData>({ cell, index }: { cell: Cell<TData, unknown>; index: number }): React.ReactElement {
    const style: React.CSSProperties = {
        width: cell.column.getSize(),
    };

    const stickyRight = cell.column.id === "manage";
    const stickyLeft = cell.column.id === "seleccionar";
    const isBlockedChargeRow = Boolean((cell.row.original as Record<string, unknown> | undefined)?.__chargeBlocked);
    const cellClass =
        stickyRight
            ? `text-sm sticky right-0 z-10 ${
                  isBlockedChargeRow ? "bg-gabu-300 text-gabu-700" : "bg-gabu-100"
              } [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-xs`
            : stickyLeft
              ? `sticky left-0 z-[24] ${
                    isBlockedChargeRow ? "bg-gabu-300 text-gabu-700 shadow-none" : "bg-gabu-100 shadow-[4px_0_12px_-8px_rgba(28,53,81,0.12)]"
                } px-2 text-xs whitespace-nowrap relative [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]`
              : "px-2 text-xs whitespace-nowrap text-ellipsis overflow-hidden relative [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]";
    const renderedCell = flexRender(cell.column.columnDef.cell, cell.getContext());
    const rawValue = cell.getValue();
    const formattedRawValue = formatNumericDisplayValue(rawValue, String(cell.column.id));
    const displayCell =
        typeof renderedCell === "number" || typeof renderedCell === "string"
            ? formatNumericDisplayValue(renderedCell, String(cell.column.id))
            : !React.isValidElement(renderedCell) && (typeof formattedRawValue === "string" || typeof formattedRawValue === "number")
              ? formattedRawValue
              : renderedCell;

    return (
        <td
            key={cell.id}
            className={`${cellClass} py-2 text-gabu-900 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 ${
                index === 0 && cell.column.id === "get" ? "flex justify-center" : ""
            } ${stickyLeft ? "flex justify-center" : ""}`}
            style={stickyLeft ? { ...style, zIndex: 24 } : style}
        >
            {displayCell}
        </td>
    );
}