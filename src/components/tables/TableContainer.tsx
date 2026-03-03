'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import MainTable from "./MainTable";
import { useFetch } from "@/hooks/useFetch";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { AllData, FieldsWithRelation } from "@/lib/models/tables/Table";
import TableForm from "./TableForm";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Loader from "../ui/Loader";
import Alert from "../ui/Alert";
import SecondaryTable, { SecondaryTableData } from "./SecondaryTable";
import { isValidDate } from "@/util/date/validate";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

export type FieldsWithRelationAndErrors = FieldsWithRelation & {
    errors: {
        isError: boolean,
        errorMessage: string | null
    }
}

export default function TableContainer<T>({connPath}: {connPath: string }) : React.ReactElement {
    const client : string = useSelector((state : RootState) => state.authorization.client);

    const options: RequestInit = useMemo(() => ({
        method: 'POST',
        body: JSON.stringify({
            petition: "Get",
            client: client,
            data: {}
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }), [client]);

    const { data, error, loading, setData } = useFetch<AllData<T>>(connPath, options);

    const [serverResponse, setServerResponse] = useState<{
        loading: boolean;
        success: boolean | null;
        message: string | null;
        loadingMessage: string | null;
    }>({ loading: false, success: null, message: null, loadingMessage: null });

    const [selectedRow, setSelectedRow] = useState<T | null>(null);

    const [resetFormKey, setResetFormKey] = useState<number>(0);

    const [resetSecondaryTableKey, setResetSecondaryTableKey] = useState<number>(100);

    const [fieldsWithErrors, setFieldsWithErrors] = useState<FieldsWithRelationAndErrors[]>([]);

    const [secondaryTableData, setSecondaryTableData] = useState<{ [key: string]: string; }[]>([]);

    const secondaryTableRef = useRef<SecondaryTableData<{ [key: string]: string }>>(null);

    const [actualValidation, setActualValidation] = useState<{
        field: keyof T,
        value: string
    }[] | null>(null);

    useEffect(() => {
        setFieldsWithErrors(data ? data.fieldsManage.map(field => ({
            ...field,
            errors: {
                isError: false,
                errorMessage: null
            }
        })) : []);
    }, [data]);

    useEffect(() => {
        if(selectedRow && data?.secondaryTable){
            getOneRecord(selectedRow[data.fieldsManage.find(field => field.relation?.[0]?.description === 'id')?.IdCampo as keyof T] as string);
        } else if(!selectedRow && data?.secondaryTable){
            const maxRowsField = data.secondaryTable.fieldsManage.find(field => field.options?.maxRows);

            if(maxRowsField){
                setSecondaryTableData(maxRowsField?.relation.map(rel => {
                    const row: {[key: string]: string} = {};
                    data.secondaryTable?.fieldsManage.forEach(field => {
                        row[field.IdCampo] = field.relation.length > 0 ? (field.options?.fixed ? rel.id! : maxRowsField.relation[0].id) : '0';
                    });
                    return row;
                }) || []);
            }
        }
    }, [selectedRow]);

    const formRef = useRef<HTMLFormElement | null>(null);

    async function getOneRecord(idValue: string) {
        const res = await fetch(connPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                petition: 'GetOne',
                client: client,
                data: {
                    id: idValue
                },
            }),
        });
        const dataRes = await res.json();

        if(dataRes.status){
            setServerResponse({ loading: false, success: false, message: dataRes.message, loadingMessage: null });
            setTimeout(() => {
                setServerResponse({ loading: false, success: null, message: null, loadingMessage: null });
            }, 5000);
        } else {
            if(data?.secondaryTable){
                const maxRowsField = data.secondaryTable.fieldsManage.find(field => field.options?.maxRows);

                if(maxRowsField){
                    setSecondaryTableData(prevTableData => {
                        return prevTableData.map((row) => {
                            let updatedRow = { ...row };
                            data.secondaryTable?.fieldsManage.forEach(field => {
                                dataRes.secondaryTableData.forEach((secRow: {[key: string]: string}) => {
                                    if(secRow[maxRowsField.IdCampo] === row[maxRowsField.IdCampo]){
                                        updatedRow[field.IdCampo] = field.relation.length > 0 && field.options?.fixed ? row[field.IdCampo] : secRow[field.IdCampo];
                                    }
                                });
                            });
                            return updatedRow;
                        });
                    });
                }
            }
            //setSecondaryTableData(dataRes.secondaryTableData);
        }
    }

    async function handleEdition(e: React.FormEvent) {
        e.preventDefault();

        setServerResponse({ loading: true, success: null, message: null, loadingMessage: "Actualizando registro..." });

        const target = e.target as HTMLFormElement;

        const formData = new FormData(target);

        const formEntries = Object.fromEntries(formData.entries());

        const formEntriesSanitized = sanitizeFormObject(formEntries);

        const secondaryData = secondaryTableRef.current?.getCurrentTableData();

        const res = await fetch(connPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                petition: 'UpdateOne',
                client: client,
                data: {
                    mainTableData: formEntriesSanitized,
                    secondaryTableData: secondaryData
                },
            }),
        });
        
        const dataRes = await res.json();

        if(dataRes.status){
            setServerResponse({ loading: false, success: false, message: dataRes.message, loadingMessage: null });
        } else {
            setServerResponse({ loading: false, success: true, message: "El registro se actualizó correctamente.", loadingMessage: null });
            setData(prevData => {
                if (!prevData) return null;

                const idField = prevData.fieldsManage.find(field => field.relation?.[0]?.description === 'id');

                if (!idField) return prevData;

                const idKey = idField.IdCampo as keyof T;

                const updatedTable = prevData.table.map((item) => {
                    if (item[idKey] == formEntriesSanitized[idKey as string]) {
                        return { ...item, ...formEntriesSanitized };
                    }
                    return item;
                });

                return { ...prevData, table: updatedTable };
            });
        }

        setTimeout(() => {
            setServerResponse({ loading: false, success: null, message: null, loadingMessage: null });
        }, 5000);
    }

    async function handleAddition(e: React.FormEvent) {
        e.preventDefault();
    
        setServerResponse({ loading: true, success: null, message: null, loadingMessage: "Agregando registro..." });

        const target = e.target as HTMLFormElement;

        const formData = new FormData(target);

        const formEntries = Object.fromEntries(formData.entries());

        const formEntriesSanitized = sanitizeFormObject(formEntries);

        console.log(formEntriesSanitized);

        let validationFailed = false;

        const fieldsWithErrorsUpdated =  fieldsWithErrors.map(field => {
            const fieldConfig = data?.fieldsManage.find(fld => fld.IdCampo === field.IdCampo);

            if(fieldConfig?.options?.required && (formEntriesSanitized[field.IdCampo] === null || formEntriesSanitized[field.IdCampo] === '')){
                validationFailed = true;
                return {
                    ...field,
                    errors: {
                        isError: true,
                        errorMessage: "El campo es obligatorio."
                    }
                };
            }

            if(fieldConfig?.options?.isDate && formEntriesSanitized[field.IdCampo] !== null){
                const isValid = isValidDate(formEntriesSanitized[field.IdCampo] as string);
                if(!isValid){
                    validationFailed = true;
                    return {
                        ...field,
                        errors: {
                            isError: true,
                            errorMessage: "El formato de la fecha es inválido. Utilice MM/YYYY."
                        }
                    };
                }
            }

            return field;
        });

        if(validationFailed){
            setServerResponse({ loading: false, success: null, message: null, loadingMessage: null });
            setFieldsWithErrors(fieldsWithErrorsUpdated);
            return;
        }
        const secondaryData = secondaryTableRef.current?.getCurrentTableData();

        const res = await fetch(connPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                petition: 'Insert',
                client: client,
                data: {
                    mainTableData: formEntriesSanitized,
                    secondaryTableData: secondaryData
                },
            }),
        });

        const dataRes = await res.json();
        if(dataRes.status){
            setServerResponse({ loading: false, success: false, message: dataRes.message, loadingMessage: null });
        } else {
            setServerResponse({ loading: false, success: true, message: "El registro se agregó correctamente.", loadingMessage: null });
            setData(prevData => {
                if (!prevData) return null;
                return { ...prevData, table: [formEntriesSanitized as T, ...prevData.table] };
            });
            setSelectedRow(formEntriesSanitized as T);
        }

        setTimeout(() => {
            setServerResponse({ loading: false, success: null, message: null, loadingMessage: null });
        }, 5000);
    }

    async function handleRemove() {
        setServerResponse({ loading: true, success: null, message: null, loadingMessage: "Eliminando registro..." });
        
        const idFields = data?.fieldsManage.filter(field => field.relation?.[0]?.description === 'id') || [];

        const idValues = idFields.map(field => selectedRow?.[field.IdCampo as keyof T]);
        
        const idsToSend: Record<string, string> = {};

        if(idValues[0]) idsToSend['id'] = idValues[0] as string;
        if(idValues[1]) idsToSend['secId'] = idValues[1] as string;

        if(idsToSend['id']){
            const res = await fetch(connPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    petition: 'DeleteOne',
                    client: client,
                    data: idsToSend,
                }),
            })

            const dataRes = await res.json();

            if(dataRes.status){
                setServerResponse({ loading: false, success: false, message: dataRes.message, loadingMessage: null });
            } else {
                setServerResponse({ loading: false, success: true, message: "El registro se elimino correctamente.", loadingMessage: null });
                setData(prevData => {
                    if (!prevData) return null;
                    const updatedTable = prevData.table.filter(item => item[idFields[0]!.IdCampo as keyof T] !== idValues[0]);
                    return { ...prevData, table: updatedTable };
                });
                setSelectedRow(null);
            }

            setTimeout(() => {
                setServerResponse({ loading: false, success: null, message: null, loadingMessage: null });
            }, 5000);
        }
    }


    function sanitizeFormObject(formEntries: {[key: string]: FormDataEntryValue}) : {[key: string]: unknown} {
        const sanitizedObject: {[key: string]: unknown} = {};

        for (const [key, value] of Object.entries(formEntries)) {
            if(value === ''){
                sanitizedObject[key] = null;
            } else {
                sanitizedObject[key] = value;
            }
        }

        return sanitizedObject;
    }

    function resetErrors() {
        setFieldsWithErrors(prevFields => prevFields.map(field => ({
            ...field,
            errors: {
                isError: false,
                errorMessage: null
            }
        })));
    }

    useEffect(() => {
        if(data?.secondaryTable){
            const maxRowsField = data.secondaryTable.fieldsManage.find(field => field.options?.maxRows);

            if(maxRowsField){
                setSecondaryTableData(maxRowsField?.relation.map(rel => {
                    const row: {[key: string]: string} = {};
                    data.secondaryTable?.fieldsManage.forEach(field => {
                        row[field.IdCampo] = field.relation.length > 0 ? (field.options?.fixed ? rel.id! : maxRowsField.relation[0].id) : '0';
                    });
                    return row;
                }) || []);
            }
        }
    }, [data?.secondaryTable]);

    return (
        <>
            <Modal isOpen={serverResponse.loading}>
                <Loader msg="Editando..." />
            </Modal>
            <Alert show={serverResponse.success !== null ? true : false} message={serverResponse.message} type={serverResponse.success === null || serverResponse.success ? "success" : "error"} />
            <div className="flex flex-col w-full h-full">
                <div className="main-content w-full h-full flex flex-col p-8 pb-4 pr-4 overflow-y-auto">
                    <div className="p-5 bg-gabu-500 flex rounded-md border border-gabu-900">
                        {data && <MainTable data={data.table} fields={data.fieldsManage} client={client} connPath={connPath} onRowSelect={setSelectedRow} record={selectedRow}/>}
                        {loading && <div className="w-full"><Skeleton count={5} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1"/></div>}
                    </div>
                    <div className="flex flex-col xl:flex-row p-7 gap-7">
                    {data && <TableForm<T> key={resetFormKey} fields={fieldsWithErrors} selectedRow={selectedRow} hasAnotherTable={!!data.secondaryTable} connPath={connPath} client={client} formRef={formRef} handleSubmit={selectedRow ? handleEdition : handleAddition} setErrors={resetErrors} onValidationChange={setActualValidation} />}
                    {data?.secondaryTable && <SecondaryTable key={resetSecondaryTableKey} ref={secondaryTableRef} data={secondaryTableData} fields={data.secondaryTable.fieldsManage} mainActualValidation={actualValidation} connPath={connPath} client={client} />}
                    {loading && <div className="w-full"><Skeleton count={10} height={30} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1"/></div>}
                    </div> 
                </div>
                <div className="sticky w-full h-15 bg-gabu-500 flex justify-end gap-5 p-3">
                    <Button text="Revertir" type="button" handleClick={() => {
                        setResetFormKey(prev => prev + 1);
                        setResetSecondaryTableKey(prev => prev + 1);
                    }} style="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300"/>
                    { selectedRow && (
                        <>
                            <Button text="Alta" type="button" handleClick={() => setSelectedRow(null)} style="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300"/>
                            <Button text="Eliminar" type="button" handleClick={handleRemove} style="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300"/>
                            <Button text="Guardar" type="button" handleClick={() => formRef.current?.requestSubmit()} style="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300"/>
                        </>
                    )}
                    { !selectedRow && (
                        <Button text="Agregar" type="button" handleClick={() => formRef.current?.requestSubmit()} style="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300"/>
                    )}
                </div>
            </div>
        </>
    );
}