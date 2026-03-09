'use client'

import React, { ReactElement, useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import SelectPointerLogin from "../svg/SelectPointerLogin";
import Arrow from "../svg/Arrow";

export default function Select({
  label,
  options,
  defaultValue,
  isLogin,
  hasLabel = true,
  chooseOptionHandler,
  cellId,
  variant = 'default',
  onListOpenChange,
  controlClassName,
}: {
  label: string,
  options: {key: string, value: string}[],
  defaultValue?: string,
  hasLabel?: boolean,
  isLogin: boolean,
  chooseOptionHandler: (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => void,
  cellId?: string,
  variant?: 'default' | 'entriesPerPage' | 'filterModal' | 'abm',
  onListOpenChange?: (open: boolean) => void,
  controlClassName?: string,
}) : ReactElement {
    const isEntriesPerPage = variant === 'entriesPerPage';
    const isFilterModal = variant === 'filterModal';
    const isAbm = variant === 'abm';

    const optionStyle : string = isEntriesPerPage
        ? 'px-3 py-2 text-gabu-100 text-base hover:bg-gabu-300 transition-all duration-300 bg-gabu-700 w-full'
        : isFilterModal || isAbm
        ? 'px-3 py-1 text-gabu-900 text-xs hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full'
        : `${isLogin ? 'text-base border-l-10 border-gabu-900 py-2 pl-3 pr-2' : 'px-2'} hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full`;
    const selectStyle : string = isEntriesPerPage
        ? 'border-0 bg-transparent py-2 pl-3 pr-2 w-full flex justify-between items-center cursor-pointer gap-2 min-w-0'
        : isFilterModal
        ? 'border-0 bg-gabu-100 py-1.5 pl-4 pr-3 w-full flex justify-between items-center cursor-pointer gap-2'
        : isAbm
        ? 'border-0 bg-gabu-100 rounded-md font-normal px-3 py-0.5 w-full flex justify-between items-center cursor-pointer gap-2'
        : ` ${isLogin ? 'border-l-10 border-2' : 'border'}  border-gabu-900 py-2 pl-3 pr-2 w-full flex justify-between items-center cursor-pointer filter`;
    const optionListStyle : string = isEntriesPerPage
        ? 'w-full rounded-b-md border border-gabu-700 border-t-0 overflow-visible options-list bg-gabu-700'
        : isFilterModal
        ? 'w-full rounded-b-2xl border border-t-0 border-gabu-300 mt-0 overflow-hidden options-list bg-gabu-100 max-h-25 overflow-y-auto shadow-lg'
        : isAbm
        ? 'w-full rounded-b-md border border-t-2 border-t-gabu-300 border-x border-b border-gabu-700 mt-0 overflow-hidden options-list bg-gabu-100 max-h-25 overflow-y-auto'
        : `w-full ${isLogin ? 'border-r-2 border-b-2' : 'border'} rounded-b-md border-gabu-900 max-h-25 overflow-y-auto options-list`;

    const [isOptionListVisible, setIsOptionListVisible] = useState<boolean>(false);
    const [longestOption, setLongestOption] = useState<{value: string}>(options.reduce((a, b) => a.value.length > b.value.length ? a : b, {value: ""}));

    const selectRef = useRef<HTMLDivElement>(null);
    const valueSelectedRef = useRef<HTMLSpanElement>(null);
    const optionListRef = useRef<HTMLUListElement>(null);

    function selectOptionHandler(e: React.MouseEvent){
        setIsOptionListVisible(!isOptionListVisible);
    }

    useEffect(() => {
        onListOpenChange?.(isOptionListVisible);
    }, [isOptionListVisible, onListOpenChange]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if(selectRef.current && !selectRef.current.contains(e.target as Node)){
                setIsOptionListVisible(false);
            }
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [])

    const defaultSelectedOption = options.find(option => option.key === defaultValue);

    useEffect(() => {
        if(valueSelectedRef.current){
            valueSelectedRef.current!.textContent = defaultSelectedOption?.value || '';
            valueSelectedRef.current!.dataset.key = defaultSelectedOption?.key || '';
        }
    }, [defaultValue]);

    useEffect(() => {
        setLongestOption(options.reduce((a, b) => a.value.length > b.value.length ? a : b, {value: ""}));
    }, [options]);

    const labelClass = hasLabel
        ? isFilterModal
            ? 'text-gabu-100 text-sm font-normal'
            : isAbm
            ? 'text-gabu-100 text-xs font-normal'
            : 'text-gabu-900 text-lg'
        : '';
    const valueSpanClass = isEntriesPerPage
        ? 'text-base text-gabu-100'
        : isFilterModal || isAbm
        ? 'text-sm text-gabu-700 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
        : `${isLogin ? 'text-base' : 'text-xs'} text-gabu-900`;
    const arrowColor = isEntriesPerPage ? 'text-gabu-100' : (isFilterModal || isAbm) ? 'text-gabu-900' : 'text-gabu-900';
    const borderRadius = isFilterModal ? (isOptionListVisible ? "8px 8px 0 0" : "8px") : isAbm ? (isOptionListVisible ? "6px 6px 0 0" : "6px") : (isOptionListVisible ? "6px 6px 0px 0px" : "6px");

    return (
        <div className="flex flex-col gap-1 cursor-pointer">
            {hasLabel && <label className={labelClass}>{label}</label>}
            <div className="relative">
                <motion.div className={`${selectStyle} ${controlClassName ?? ''}`.trim()} onClick={selectOptionHandler} ref={selectRef} initial={false} animate={{ borderRadius }} transition={{ borderRadius: { duration: 0.1, ease: "easeInOut" } }}>
                    <span className={valueSpanClass} id="select-value" ref={valueSelectedRef} data-key={defaultSelectedOption?.key || ''} data-cellid={cellId}>{defaultSelectedOption?.value || ''}</span>
                    {isLogin ? <SelectPointerLogin active={isOptionListVisible}/> : <Arrow active={isOptionListVisible} defaultRotation="-rotate-90" activeRotation="rotate-90" height={9} width={9} color={arrowColor}/>}
                </motion.div>
                <div className="invisible h-0 text-xs pointer-events-none select-none" aria-hidden="true">{longestOption.value}XXXXXXX</div>
                <motion.div className={`absolute overflow-hidden w-full ${isAbm ? 'z-[10001]' : 'z-10'}`} initial={false} animate={{height: isOptionListVisible ? "auto" : 0}} transition={{duration: 0.1, ease: "easeInOut"}}>
                    <ul className={optionListStyle} ref={optionListRef}>
                        { options.map(option => <li key={option.key} className={optionStyle} onClick={(e) => { chooseOptionHandler(e, valueSelectedRef); setIsOptionListVisible(false); }} data-key={option.key}>{option.value}</li>)}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}