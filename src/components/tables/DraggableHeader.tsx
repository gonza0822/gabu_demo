import React, { useRef, useCallback } from "react";
import { Header } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import Order from "../svg/table/Order";
import ManageFields from "../svg/ManageFields";
import Filter from "../svg/Filter";
import ColumnFilter, { type ColumnType, type ColumnFilterValue } from "../fixedAssets/ColumnFilter";

type DraggableHeaderColumnFilterProps = {
    onOpenColumnFilter?: (columnId: string) => void;
    isFilterOpen?: boolean;
    isClosingColumnId?: string | null;
    onCloseColumnFilter?: () => void;
    onApplyColumnFilter?: (columnId: string, value: ColumnFilterValue) => void;
    columnType?: ColumnType;
    columnFilterValue?: ColumnFilterValue | null;
    onOpenManageFields?: (e: React.MouseEvent<HTMLElement>) => void;
};

export default function DraggableHeader<TData>({
    header,
    onOpenColumnFilter,
    isFilterOpen,
    isClosingColumnId,
    onCloseColumnFilter,
    onApplyColumnFilter,
    columnType,
    columnFilterValue,
    onOpenManageFields,
}: { header: Header<TData, unknown> } & DraggableHeaderColumnFilterProps) : React.ReactElement  {
    const {attributes, isDragging, listeners, setNodeRef, transform, transition} = useSortable({ id: header.id });
    const thRef = useRef<HTMLTableCellElement | null>(null);
    const setRef = useCallback((el: HTMLTableCellElement | null) => {
        setNodeRef(el);
        thRef.current = el;
    }, [setNodeRef]);

    const style: React.CSSProperties = {
        width: header.getSize(),
        transform: CSS.Translate.toString(transform),
        transition: transition,
        zIndex: isDragging ? 100 : 0,
    };

    if(header.id === 'manage'){
        return (
            <th className="text-start py-2 text-gabu-900 sticky right-0 z-50 bg-gabu-100">
                <div
                    data-manage-fields-trigger
                    role="button"
                    tabIndex={0}
                    className="px-4 flex justify-center cursor-pointer"
                    title="Administrar campos"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenManageFields?.(e as unknown as React.MouseEvent<HTMLElement>);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).click();
                        }
                    }}
                >
                    <ManageFields style="h-[18px] w-[18px] fill-current text-gabu-900"/>
                </div>
            </th>
        );
    }

    const showColumnFilter = header.column.id !== 'get' && onOpenColumnFilter && columnType !== undefined;
    const isThisFilterOpen = isFilterOpen && columnType !== undefined;

    const handleSortClick = (e: React.MouseEvent) => {
        if (!header.column.getCanSort()) return;
        header.column.getToggleSortingHandler()?.(e);
    };

    return (
        <th
            key={header.id}
            className={`text-start py-2 px-2 text-gabu-900 whitespace-nowrap overflow-x-hidden relative`}
            style={style}
            ref={setRef}
        >
            <div className="flex items-center gap-2">
                <div
                    className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                    {...(header.id !== 'get' ? {...attributes} : {})}
                    {...(header.id !== 'get' ? {...listeners} : {})}
                    onClick={handleSortClick}
                >
                    <p className="text-xs text-ellipsis overflow-hidden">{flexRender(header.column.columnDef.header, header.getContext())}</p>
                    {header.column.id !== 'get' && header.column.getCanSort() && <Order style="h-[15px] w-[8px] shrink-0 cursor-pointer" />}
                </div>
                {showColumnFilter && (
                    <span
                        data-column-filter-trigger
                        className="shrink-0 cursor-pointer flex items-center"
                        onClick={(e) => { e.stopPropagation(); onOpenColumnFilter?.(header.id); }}
                        title="Filtrar columna"
                    >
                        <Filter style="h-[15px] w-[15px] stroke-current text-gabu-900" />
                    </span>
                )}
                <div
                    {...{
                        onDoubleClick: () => header.column.resetSize(),
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        onClick: (e: React.MouseEvent) => e.stopPropagation(),
                        className: `absolute top-0 right-0 h-full w-[5px] cursor-col-resize`,
                    }}
                />
            </div>
            {showColumnFilter && isThisFilterOpen && onCloseColumnFilter && onApplyColumnFilter && (
                <ColumnFilter
                    columnId={header.id}
                    columnType={columnType}
                    isOpen={true}
                    isClosing={isClosingColumnId === header.id}
                    onClose={onCloseColumnFilter}
                    onApply={(value) => onApplyColumnFilter(header.id, value)}
                    initialValue={columnFilterValue}
                    anchorRef={thRef}
                />
            )}
        </th>
    );
};