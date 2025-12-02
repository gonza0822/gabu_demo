'use client'

import React, { ReactElement, useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { authorizationActions } from "@/store/authorizationSlice";
import { RootState } from "@/store";

export default function Select({
  SelectPointer,
  label,
  options,
  defaultValue,
  isLogin,
  chooseOptionHandler
}: {
  SelectPointer: React.FC<{active: boolean}>;
  label: string,
  options: {key: string, value: string}[],
  defaultValue?: string,
  isLogin: boolean,
  chooseOptionHandler: (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => void
}) : ReactElement {
    const optionStyle : string = `${isLogin ? 'text-base border-l-10 border-gabu-900 py-2 pl-3 pr-2' : 'px-2'} hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full`;
    const selectStyle : string = `border-2 ${isLogin && 'border-l-10'}  border-gabu-900 py-2 pl-3 pr-2 w-full flex justify-between cursor-pointer filter`;
    const optionListStyle : string = 'w-full border-r-2 border-b-2 rounded-b-md border-gabu-900';

    const dispatch : Dispatch = useDispatch();

    const [isOptionListVisible, setIsOptionListVisible] = useState<boolean>(false);

    const selectRef = useRef<HTMLDivElement>(null);
    const valueSelectedRef = useRef<HTMLSpanElement>(null);
    const optionListRef = useRef<HTMLUListElement>(null);

    function selectOptionHandler(e: React.MouseEvent){
        setIsOptionListVisible(!isOptionListVisible);
    }

    /* function chooseOptionHandler(e: React.MouseEvent<HTMLLIElement>) {
        const target = e.target as HTMLSpanElement;
        
        valueSelectedRef.current!.textContent = target.textContent;

        if(isLogin){
            dispatch(authorizationActions.clientConnect({
                client: target.textContent || ''
            }));
        }
    } */

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

    return (
        <div className="flex flex-col gap-1 cursor-pointer">
            <label className="text-gabu-900 text-lg">{label}</label>
            <div className="relative">
            <motion.div className={selectStyle} onClick={selectOptionHandler} ref={selectRef} initial={false} animate={{borderRadius: isOptionListVisible ? "6px 6px 0px 0px" : "6px"}} transition={{borderRadius: {duration: 0.1, ease: "easeInOut"}}}>
                <span className="text-base text-gabu-900" id="select-value" ref={valueSelectedRef}>{defaultValue}</span>
                <SelectPointer active={isOptionListVisible}/>
            </motion.div>
            <motion.div className="absolute overflow-hidden w-full z-10" initial={false} animate={{height: isOptionListVisible ? "auto" : 0}} transition={{duration: 0.1, ease: "easeInOut"}}>
                <ul className={optionListStyle} ref={optionListRef}>
                    { options.map(option => <li key={option.key} className={optionStyle} onClick={(e) => chooseOptionHandler(e, valueSelectedRef)}>{option.value}</li>)}
                </ul>
            </motion.div>
            </div>
        </div>
    );
}