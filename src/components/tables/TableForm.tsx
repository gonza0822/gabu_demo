'use client';
import React, { act, use, useEffect, useMemo, useState } from "react";
import { Validation } from "@/lib/models/tables/Table";
import HorizontalSelect from "../ui/HorizontalSelect";
import HorizontalInput from "../ui/HorizontalInput";
import { useFetch } from "@/hooks/useFetch";
import { FieldsWithRelationAndErrors } from "./TableContainer";

export default function TableForm<TData>({fields, selectedRow, hasAnotherTable, connPath, client, formRef, onValidationChange, handleSubmit, setErrors}: {fields: FieldsWithRelationAndErrors[], selectedRow: TData | null , hasAnotherTable: boolean, connPath: string, client: string, formRef: React.RefObject<HTMLFormElement | null>, onValidationChange: React.Dispatch<React.SetStateAction<{ field: keyof TData, value: string }[] | null>>, handleSubmit: (e: React.FormEvent) => void, setErrors: () => void}) : React.ReactElement {

    const [actualValidation, setActualValidation] = useState<{
        field: keyof TData,
        value: string
    }[] | null>(null);

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

    const { data, error, loading } = useFetch<Validation<TData>>(connPath, options);

    useEffect(() => {
        let foundValidation = false;
        if(selectedRow && data){
            fields.forEach(field => {
                if(selectedRow[field.IdCampo as keyof TData]){
                    let fieldValidations = data[field.IdCampo as keyof TData];
                    if(fieldValidations){
                        setActualValidation(prevValidation => {
                            if(prevValidation){
                                return prevValidation.map(validation => {
                                    if(validation.field === field.IdCampo as keyof TData){
                                        return {
                                            field: field.IdCampo as keyof TData,
                                            value: selectedRow[field.IdCampo as keyof TData] as string
                                        }
                                    }
                                    return validation;
                                });
                            }
                            return prevValidation;
                        });
                        foundValidation = true;
                    }
                }
            });
        } else if(!selectedRow && data) {
            setActualValidation(fields.filter(field => {
                return data[field.IdCampo as keyof TData];
            }).map(field => {
                return {
                    field: field.IdCampo as keyof TData,
                    value: '0'
                }
            }));
            foundValidation = true;
        }

        if(!foundValidation){
            setActualValidation(null);
        }
    }, [selectedRow, data]);
    
    async function chooseOptionHandler(e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLInputElement | null>) {
        const target = e.target as HTMLLIElement;

        if(ref.current && target.dataset.key){
            ref.current.value = target.textContent;
            ref.current.dataset.key = target.dataset.key || '';
            setActualValidation(prevValidation => {
                if(prevValidation && ref.current && data){
                    const existValidation = prevValidation.some(validation => validation.field === ref.current!.dataset.field);

                    if(existValidation){
                        return prevValidation.map(validation => {
                            if(validation.field === ref.current!.dataset.field){
                                return {
                                    field: validation.field,
                                    value: ref.current!.dataset.key || ''
                                };
                            }
                            const fieldValidations = data[ref.current!.dataset.field as keyof TData];
                            if (!fieldValidations) return validation;
                            
                            const valueValidations = fieldValidations[ref.current!.dataset.key || ''];
                            if (!valueValidations) return validation;

                            if(valueValidations[validation.field as keyof TData] !== true) {
                                return {
                                    field: validation.field,
                                    value: '0'
                                };
                            }
                            return validation;
                        });
                    }

                    const updatedValidation = prevValidation.map(validation => {
                        const fieldValidations = data[ref.current!.dataset.field as keyof TData];
                        if (!fieldValidations) return validation;
                        
                        const valueValidations = fieldValidations[ref.current!.dataset.key || ''];
                        if (!valueValidations) return validation;

                        if(valueValidations[validation.field as keyof TData] !== true) {
                            return {
                                field: validation.field,
                                value: '0'
                            };
                        }
                        return validation;
                    });

                    return [
                        ...updatedValidation,
                        {
                            field: ref.current!.dataset.field as keyof TData,
                            value: ref.current!.dataset.key || '0'
                        }
                    ]
                } else {
                    return [{
                        field: ref.current!.dataset.field as keyof TData,
                        value: ref.current!.dataset.key || '0'
                    }];
                }
            });
        }

    }

    function isFieldDisabled(fieldId: keyof TData): boolean {
        if(!data || !actualValidation) return false;

        return actualValidation.some(validation => {
            const fieldValidations = data[validation.field];
            if (!fieldValidations) return false;
            
            const valueValidations = fieldValidations[validation.value];
            if (!valueValidations) return false;

            const isAble = valueValidations[fieldId as keyof TData];

            return isAble !== true;
        });
    }

    useEffect(() => {
        onValidationChange(actualValidation);
    }, [actualValidation, onValidationChange]);

    console.log(actualValidation);

    return (
        <form className="flex flex-col gap-3 min-w-0 xl:flex-1" ref={formRef} onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 min-w-0">
                {fields.map((field, index) => {
                    if(field.relation.length > 0 && field.relation[0].description !== 'id') {
                        const defualtValue = selectedRow ? (selectedRow[field.IdCampo as keyof TData] as string) : (field.options?.defaultValue as string || '0');

                        return (
                            <HorizontalSelect key={field.IdCampo} label={field.BrowNombre || ''} options={field.relation.map(rel => ({key: rel.id, value: rel.description || ''}))} chooseOptionHandler={chooseOptionHandler} colSpan={(hasAnotherTable || (fields.length > 2 && index === 0)) ? 'col-span-2' : 'col-span-1'} hasToBeProportional={!hasAnotherTable && (fields.length > 2 && index === 0)} defaultValue={defualtValue} fieldId={field.IdCampo} disabled={isFieldDisabled(field.IdCampo as keyof TData)} selectedRow={selectedRow}/>
                        );
                    } else {
                        return (
                            <HorizontalInput label={field.BrowNombre || ''} key={field.IdCampo} colSpan={(hasAnotherTable || (fields.length > 2 && index === 0)) ? 'col-span-2' : 'col-span-1'} hasToBeProportional={!hasAnotherTable && (fields.length > 2 && index === 0)} defaultValue={selectedRow ? selectedRow[field.IdCampo as keyof TData] as string : (field.options?.defaultValue as string || '')} readOnly={field.relation[0]?.description === 'id' && selectedRow ? true : false} disabled={isFieldDisabled(field.IdCampo as keyof TData)} fieldId={field.IdCampo} isError={field.errors.isError} errorMessage={field.errors.errorMessage} setErrors={setErrors}/>
                        )
                    }
                })}
            </div>
        </form>
    );
}