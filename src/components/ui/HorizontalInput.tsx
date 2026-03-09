import React, { useEffect, useState } from "react";

export default function HorizontalInput({ label, colSpan, hasToBeProportional, defaultValue, fixedValue, disabled, fieldId, readOnly, isError, errorMessage, setErrors, onValueChange, inputType = 'text', inputStep }: { label: string, colSpan?: string, hasToBeProportional: boolean, defaultValue?: string, fixedValue?: string, disabled?: boolean, fieldId: string, readOnly?: boolean, isError: boolean, errorMessage: string | null, setErrors: () => void, onValueChange?: (val: string) => void, inputType?: 'text' | 'number', inputStep?: string }) : React.ReactElement {
    const [value, setValue] = useState(fixedValue ?? defaultValue ?? '');
    
    const [showError, setShowError] = useState(isError);

    if(isError){
        console.log(isError, showError);
    }

    useEffect(() => {
        setShowError(isError);
    }, [isError]);

    useEffect(() => {
        if (fixedValue !== undefined) {
            setValue(fixedValue);
        } else {
            setValue(defaultValue || '');
        }
    }, [defaultValue, fixedValue]);

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        if(isError){
            setShowError(false);
            setErrors();
        }
        setValue(e.target.value);
        onValueChange?.(e.target.value);
    }

    return (
        <div className={`flex rounded-l-xl rounded-r-md border border-gabu-900 items-center h-7 ${colSpan || ''} ${disabled && 'bg-gabu-300'} relative`}>
            <label className={`text-sm xl:text-xs text-gabu-100 whitespace-nowrap h-full rounded-l-xl flex items-center pl-2 ${hasToBeProportional ? 'w-[14.8%]' : 'w-[30%]'} bg-gabu-500`}>{label}</label>
            <input type={inputType} step={inputStep} className={`bg-gabu-100 text-gabu-700 ${hasToBeProportional ? 'w-[85.2%]' : 'w-[70%]'} h-full border-l border-l-gabu-900 outline-none focus:outline-none focus:ring-0 px-2 rounded-r-md ${disabled && 'bg-gabu-300'} ${showError ? 'border-2 border-gabu-error border-l-gabu-error' : ''}`} value={value} readOnly={readOnly || disabled} name={fieldId} onChange={handleInputChange}/>
            {showError && (
                <div className="absolute bg-gabu-error top-[calc(100%+6px)] right-0 rounded-lg flex flex-col z-100">
                <span className="absolute -top-1.5 start-5 w-4 h-4 bg-gabu-error rotate-45 rounded-sm"></span>
                <p className="p-1 px-3 text-gabu-100 text-sm">{errorMessage}</p>
                </div>
            )}
        </div>
    );
}