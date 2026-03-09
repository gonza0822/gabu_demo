import React, { use, useMemo } from "react";
import Arrow from "../svg/Arrow";
import { useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

export default function HorizontalSelect<TData>({label, options, defaultValue, colSpan, hasToBeProportional, disabled, fieldId, selectedRow, chooseOptionHandler, onValueChange}: {label: string, options: {key: string, value: string}[], defaultValue?: string, colSpan?: string, hasToBeProportional: boolean, disabled?: boolean, fieldId?: string, selectedRow?: TData, chooseOptionHandler: (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLInputElement | null>) => void, onValueChange?: (key: string, value: string) => void}) : React.ReactElement {

    const [isOptionListVisible, setIsOptionListVisible] = useState<boolean>(false);

    const selectRef = useRef<HTMLDivElement>(null);
    const valueSelectedRef = useRef<HTMLInputElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const optionListRef = useRef<HTMLUListElement>(null);

    function selectOptionHandler(e: React.MouseEvent){
        setIsOptionListVisible(!isOptionListVisible);
    }

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if(selectRef.current && !selectRef.current.contains(e.target as Node)){
                setIsOptionListVisible(false);
            }
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.addEventListener('click', handleClickOutside);
        } 

    }, [])

    const defaultSelectedOption = useMemo(() => options.find(option => option.key === defaultValue), [options, defaultValue]);

    useEffect(() => {
        valueSelectedRef.current!.value = defaultSelectedOption?.value || '';
        valueSelectedRef.current!.dataset.key = defaultSelectedOption?.key || '';
        hiddenInputRef.current!.value = defaultSelectedOption?.key || '';
    }, [selectedRow]);

    useEffect(() => {
        if(disabled){
            valueSelectedRef.current!.value = options[0].value;
            valueSelectedRef.current!.dataset.key = '0';
            hiddenInputRef.current!.value = '0';
        }
    }, [disabled]);

    return (
        <div className={`flex rounded-l-xl rounded-r-md border border-gabu-900 items-center h-7 ${colSpan || ''}`}>
            <label className={`text-sm xl:text-xs text-gabu-100 whitespace-nowrap h-full rounded-l-xl flex items-center pl-2 ${hasToBeProportional ? 'w-[14.8%]' : 'w-[30%]'} bg-gabu-500`}>{label}</label>
            <div className={`relative h-full ${hasToBeProportional ? 'w-[85.2%]' : 'w-[70%]'} ${disabled && 'bg-gabu-300 pointer-events-none'}`}>
                <motion.div className={`bg-gabu-100 h-full flex justify-between items-center cursor-pointer filter-acc px-3 rounded-r-xl border-l border-l-gabu-700 filter ${disabled ? 'bg-gabu-300 pointer-events-none' : ''}`} onClick={selectOptionHandler} ref={selectRef}>
                    <input className="text-sm xl:text-xs text-gabu-700 outline-none focus:outline-none focus:ring-0" id="select-value" data-field={fieldId} data-key={defaultSelectedOption?.key || ''} ref={valueSelectedRef} readOnly />
                    <input type="hidden" name={fieldId} value={valueSelectedRef.current?.dataset.key || ''} ref={hiddenInputRef}/>
                    <Arrow active={isOptionListVisible} defaultRotation="-rotate-90" activeRotation="rotate-90" height={9} width={9} color="text-gabu-900"/>
                </motion.div>
                <motion.div className="absolute w-full overflow-hidden h-21 z-[10001]" initial={false} animate={{height: isOptionListVisible ? "auto" : 0}} transition={{duration: 0.1, ease: "easeInOut"}}>
                    <ul className="w-full h-full rounded-b-md font-normal cursor-pointer box-border border-t-2 border-t-gabu-300 border-x border-b border-gabu-700 bg-gabu-100 max-h-25 overflow-y-auto options-list" ref={optionListRef}>
                        {options.map((option) => (
                            <li key={option.key} className="text-sm xl:text-xs hover:bg-gabu-300 transition-all duration-300 option px-3 text-gabu-700" data-key={option.key} onClick={(e) => { chooseOptionHandler(e, valueSelectedRef); onValueChange?.(option.key, option.value); }}>{option.value}</li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}