import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createColumnHelper, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { FieldsWithRelation, Validation } from "@/lib/models/tables/Table";
import Select from "../ui/Select";
import Input from "../ui/Input";
import { useFetch } from "@/hooks/useFetch";

export interface SecondaryTableData<TData> {
    getCurrentTableData: () => TData[];
}

export default function SecondaryTable<TData, MainData>({data, fields, ref, mainActualValidation, connPath, client} : {data: TData[], fields: FieldsWithRelation[], ref: React.Ref<SecondaryTableData<TData>>, mainActualValidation: { field: keyof MainData, value: string }[] | null, connPath: string, client: string}) : React.ReactElement {
    
    const columnHelper = createColumnHelper<TData>();

    const [dataTable, setDataTable] = useState<TData[]>(data);

    
    const [actualValidation, setActualValidation] = useState<{
        field: keyof MainData,
        value: string
    }[] | null>(mainActualValidation);

    useEffect(() => {
        setActualValidation(mainActualValidation);
    }, [mainActualValidation]);

    const inputRefs = useRef<Map<string, React.RefObject<HTMLInputElement | null>>>(new Map());
    const selectRefs = useRef<Map<string, React.RefObject<string | null>>>(new Map());

    const options: RequestInit = useMemo(() => ({
        method: 'POST',
        body: JSON.stringify({
            petition: "getValidations",
            client: client,
            data: {}
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }), [client]);

    const { data: validations, error, loading } = useFetch<Validation<MainData>>(connPath, options);

    useEffect(() => {
        setDataTable(data);
    }, [data]);

    useEffect(() => {
        table.getRowModel().rows.forEach(row => {
            row.getVisibleCells().forEach(cell => {
                const rowField = fields.find(field => field.IdCampo === cell.column.id);
                const isInput = !(rowField && rowField.relation.length > 0 && rowField.relation[0].description !== 'id' && !rowField.options?.fixed) && !rowField?.options?.fixed && !rowField?.options?.hidden;
                if(isInput) {
                    const ref = getInputRef(cell.id);
                    if(ref.current){
                        actualValidation?.forEach(validation => {
                            const fieldsValidation = validations ? validations[validation.field as keyof MainData] : null;
                            if(fieldsValidation){
                                const valueValidation = fieldsValidation[validation.value];
                                if(valueValidation){
                                    const secondTableFieldValidation = valueValidation[cell.column.id as keyof MainData];
                                }
                            }
                        });
                        ref.current.value = cell.getValue() as string;
                    }
                };
            });
        });
    }, [dataTable, validations]);

    const columns = useMemo(() => [
        ...fields.map(field => columnHelper.accessor((row: TData) => row[field.IdCampo as keyof TData], {
            id: field.IdCampo,
            header: field.BrowNombre ?? '',
            cell: info => info.getValue(),
        }))
    ], [fields, columnHelper]);

    const table = useReactTable({
        data: dataTable,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    async function chooseOptionHandler(e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>){
        const target = e.target as HTMLLIElement;

        if(ref.current && target.dataset.key){
            ref.current.textContent = target.textContent;
            ref.current.dataset.key = target.dataset.key || '';
            const selectRef = getSelectRef(ref.current.dataset.cellid!);
            console.log(ref.current.dataset.cellid!, selectRefs, inputRefs);
            selectRef.current! = target.dataset.key || '';
        }
    }

    function getInputRef(cellId: string) : React.RefObject<HTMLInputElement | null> {
        if(!inputRefs.current.has(cellId)){

            inputRefs.current.set(cellId, React.createRef<HTMLInputElement | null>());
        }
        return inputRefs.current.get(cellId)!;
    }

    function getSelectRef(cellId: string, value: string | undefined = undefined) : React.RefObject<string | null> {
        if(!selectRefs.current.has(cellId) && value){
            selectRefs.current.set(cellId, React.createRef<string | null>());
            selectRefs.current.get(cellId)!.current = value;
        }
        return selectRefs.current.get(cellId)!;
    }

    function getCurrentTableData() : TData[] {
        return table.getRowModel().rows.map(row => {
            const rowData: TData = {} as TData;

            row.getVisibleCells().forEach(cell => {
                const columndId = cell.column.id;
                const inputRef = getInputRef(cell.id);
                const selectRef = getSelectRef(cell.id);

                if(inputRef && inputRef.current){
                    rowData[columndId as keyof TData] = inputRef.current.value as TData[keyof TData];
                } else if(selectRef && selectRef.current){
                    rowData[columndId as keyof TData] = selectRef.current as TData[keyof TData];
                } else {
                    rowData[columndId as keyof TData] = cell.getValue() as TData[keyof TData];
                }
            });

            return rowData;
        });
    }

    function isFieldDisabled(fieldId: keyof MainData, cellId: string): boolean {
        if(!validations || !actualValidation) return false;

        return actualValidation.some(validation => {
            const fieldValidations = validations[validation.field];
            if (!fieldValidations) return false;
            
            const valueValidations = fieldValidations[validation.value];
            if (!valueValidations) return false;

            const isAble = valueValidations[fieldId as keyof MainData];

            if(typeof isAble !== "boolean" && isAble){
                const inputRef = getInputRef(cellId);
                if(inputRef && inputRef.current){
                    inputRef.current.value = isAble.value as string;
                }
            }

            return isAble !== true;
        });
    }

    useImperativeHandle(ref, () => ({
        getCurrentTableData,
    }));

    return (
        <div className="p-5 pt-2 bg-gabu-500 flex flex-1 flex-col rounded-md border border-gabu-900">
            <div className="flex w-full justify-center mb-2">
                <p className="text-gabu-100">Vidas utiles y grupos</p>
            </div>
            <div className="bg-gabu-100 h-full border border-gabu-900 p-3" id="remove-asset-table">
                <table className="border-collapse divide-y-2 divide-gabu-900/25 w-full">
                    <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const columnField = fields.find(field => field.IdCampo === header.id);
                                if(columnField?.options?.hidden){
                                    return null;
                                }
                                return (
                                    <th key={header.id} className="text-start py-2 px-2 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm">{flexRender(header.column.columnDef.header, header.getContext())}</p>
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                    </thead>
                    <tbody className="divide-y-2 divide-gabu-900/25 relative">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => {
                                    const rowField = fields.find(field => field.IdCampo === cell.column.id);
                                    const isSelect = rowField && rowField.relation.length > 0 && rowField.relation[0].description !== 'id' && !rowField.options?.fixed;
                                    const isInput = !isSelect && !rowField?.options?.fixed && !rowField?.options?.hidden;
                                    if(rowField?.options?.hidden){
                                        return null;
                                    }
                                    if(isSelect){
                                        getSelectRef(cell.id, cell.getValue() as string);
                                    }
                                    
                                    return (
                                        <td key={cell.id} className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                            {isSelect ? <Select label="" hasLabel={false} isLogin={false} options={rowField.relation.map(rel => ({key: rel.id, value: rel.description!}))} defaultValue={cell.getValue() as string} chooseOptionHandler={chooseOptionHandler} cellId={cell.id}/> : (isInput ? <Input label="" hasLabel={false} isLogin={false} disabled={isFieldDisabled(cell.column.id as keyof MainData, cell.id)} type="number" ref={getInputRef(cell.id)} isError={false} errorMessage={null} defaultValue={cell.getValue() as string}/> : <span>{rowField.relation.find(rel => rel.id === cell.getValue())?.description}</span>)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {/* <tr className="">
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">Moneda local</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">36</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">01</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">GENERAL</td>
                        </tr>
                        <tr className="">
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">Impuesto</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">36</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">01</td>
                            <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">GENERAL</td>
                        </tr> */}
                    </tbody>
                </table>
            </div>
        </div>
    );
}