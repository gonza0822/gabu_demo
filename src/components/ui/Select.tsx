'use client'

import React, { ReactElement, useCallback, useEffect, useLayoutEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import SelectPointerLogin from "../svg/SelectPointerLogin";
import Arrow from "../svg/Arrow";

type FixedDropdownRect = { top: number; left: number; width: number };

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
  entriesListClassName,
  entriesToolbarTone,
  entriesUseFixedDropdown,
}: {
  label: string,
  options: {key: string, value: string}[],
  defaultValue?: string,
  hasLabel?: boolean,
  isLogin: boolean,
  chooseOptionHandler: (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => void,
  cellId?: string,
  variant?: 'default' | 'entriesPerPage' | 'filterModal' | 'abm' | 'tableCell',
  onListOpenChange?: (open: boolean) => void,
  controlClassName?: string,
  /** Extra classes for the entries-per-page options panel (e.g. min-width). */
  entriesListClassName?: string,
  /** List/option background to match toolbar (Manage: 700, Inversiones: 500). */
  entriesToolbarTone?: 'gabu-500' | 'gabu-700',
  /** Render entries list in a fixed portal (avoids overlap/clipping vs scroll areas). */
  entriesUseFixedDropdown?: boolean,
}) : ReactElement {
    const isEntriesPerPage = variant === 'entriesPerPage';
    const entriesOptionBgClass = (entriesToolbarTone ?? 'gabu-700') === 'gabu-500' ? 'bg-gabu-500' : 'bg-gabu-700';
    const entriesListBgClass = (entriesToolbarTone ?? 'gabu-700') === 'gabu-500' ? 'bg-gabu-500' : 'bg-gabu-700';
    const entriesListBorderClass =
        (entriesToolbarTone ?? 'gabu-700') === 'gabu-500'
            ? 'border border-gabu-900/40 border-t-0'
            : 'border border-gabu-700 border-t-0';
    const isFilterModal = variant === 'filterModal';
    const isAbm = variant === 'abm';
    const isTableCell = variant === 'tableCell';

    const optionStyle : string = isEntriesPerPage
        ? `px-3 py-1.5 text-gabu-100 text-sm hover:bg-gabu-300 transition-all duration-300 w-full ${entriesOptionBgClass}`
        : isTableCell
        ? 'px-2 py-1 text-gabu-900 text-xs leading-snug hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full'
        : isFilterModal || isAbm
        ? 'px-3 py-1 text-gabu-900 text-xs hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full'
        : `${isLogin ? 'text-base border-l-10 border-gabu-900 py-2 pl-3 pr-2' : 'px-2'} hover:bg-gabu-300 transition-all duration-300 bg-gabu-100 w-full`;
    const selectStyle : string = isEntriesPerPage
        ? 'border-0 bg-transparent py-1.5 pl-3 pr-2 w-full flex justify-between items-center cursor-pointer gap-2 min-w-0'
        : isFilterModal
        ? 'border-0 bg-gabu-100 py-1.5 pl-4 pr-3 w-full flex justify-between items-center cursor-pointer gap-2'
        : isAbm
        ? 'border-0 bg-gabu-100 rounded-md font-normal px-3 py-0.5 w-full flex justify-between items-center cursor-pointer gap-2'
        : isTableCell
        ? 'border border-gabu-900 bg-gabu-100 py-1 pl-2 pr-1.5 min-h-0 w-full flex justify-between items-center cursor-pointer gap-1.5 rounded-md'
        : ` ${isLogin ? 'border-l-10 border-2' : 'border'}  border-gabu-900 py-2 pl-3 pr-2 w-full flex justify-between items-center cursor-pointer filter`;
    const optionListStyle: string = isEntriesPerPage
        ? `w-full rounded-b-md ${entriesListBorderClass} overflow-visible options-list ${entriesListBgClass} shadow-md ${entriesListClassName ?? ''}`.trim()
        : isFilterModal
          ? "w-full rounded-b-2xl border border-t-0 border-gabu-300 mt-0 overflow-hidden options-list bg-gabu-100 max-h-25 overflow-y-auto shadow-lg"
          : isAbm
            ? "w-full rounded-b-md border border-t-2 border-t-gabu-300 border-x border-b border-gabu-700 mt-0 overflow-hidden options-list bg-gabu-100 max-h-25 overflow-y-auto"
            : isTableCell
              ? "w-full border border-t-0 border-gabu-900 rounded-b-md mt-0 overflow-hidden options-list bg-gabu-100 max-h-25 overflow-y-auto"
            : `w-full ${isLogin ? "border-r-2 border-b-2" : "border"} rounded-b-md border-gabu-900 max-h-25 overflow-y-auto options-list`;
    const entriesPortalListClass: string = isEntriesPerPage
        ? `rounded-b-md ${entriesListBorderClass} options-list ${entriesListBgClass} shadow-md ${entriesListClassName ?? ""}`.trim()
        : "";

    const [isOptionListVisible, setIsOptionListVisible] = useState<boolean>(false);
    const [longestOption, setLongestOption] = useState<{value: string}>(options.reduce((a, b) => a.value.length > b.value.length ? a : b, {value: ""}));
    const [fixedDropdownRect, setFixedDropdownRect] = useState<FixedDropdownRect | null>(null);

    const selectRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const valueSelectedRef = useRef<HTMLSpanElement>(null);
    const optionListRef = useRef<HTMLUListElement>(null);
    const portalListRef = useRef<HTMLUListElement>(null);

    const useFixedEntriesList = Boolean(isEntriesPerPage && entriesUseFixedDropdown);

    const syncFixedDropdownRect = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setFixedDropdownRect({
            top: r.bottom + 1,
            left: r.left,
            width: Math.max(r.width, 160),
        });
    }, []);

    function selectOptionHandler(e: React.MouseEvent){
        setIsOptionListVisible(!isOptionListVisible);
    }

    useEffect(() => {
        onListOpenChange?.(isOptionListVisible);
    }, [isOptionListVisible, onListOpenChange]);

    useLayoutEffect(() => {
        if (!useFixedEntriesList || !isOptionListVisible) {
            setFixedDropdownRect(null);
            return;
        }
        syncFixedDropdownRect();
        const onReposition = () => syncFixedDropdownRect();
        window.addEventListener("resize", onReposition);
        window.addEventListener("scroll", onReposition, true);
        return () => {
            window.removeEventListener("resize", onReposition);
            window.removeEventListener("scroll", onReposition, true);
        };
    }, [useFixedEntriesList, isOptionListVisible, syncFixedDropdownRect]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const t = e.target as Node;
            if (selectRef.current?.contains(t)) return;
            if (useFixedEntriesList && portalListRef.current?.contains(t)) return;
            setIsOptionListVisible(false);
        }

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [useFixedEntriesList]);

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
            : isAbm || isTableCell
            ? 'text-gabu-100 text-xs font-normal'
            : 'text-gabu-900 text-lg'
        : '';
    const valueSpanClass = isEntriesPerPage
        ? 'text-sm text-gabu-100'
        : isTableCell
        ? 'text-xs leading-snug text-gabu-900 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
        : isFilterModal || isAbm
        ? 'text-sm text-gabu-700 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
        : `${isLogin ? 'text-base' : 'text-xs'} text-gabu-900`;
    const arrowColor = isEntriesPerPage ? 'text-gabu-100' : (isFilterModal || isAbm) ? 'text-gabu-900' : 'text-gabu-900';
    const borderRadius = isFilterModal
        ? (isOptionListVisible ? "8px 8px 0 0" : "8px")
        : isAbm
        ? (isOptionListVisible ? "6px 6px 0 0" : "6px")
        : isTableCell
        ? (isOptionListVisible ? "6px 6px 0 0" : "6px")
        : (isOptionListVisible ? "6px 6px 0px 0px" : "6px");

    return (
        <div
            className={`flex cursor-pointer flex-col ${hasLabel ? "gap-1" : isEntriesPerPage ? "h-full min-h-0 gap-0" : isTableCell ? "gap-0" : "gap-1"}`}
        >
            {hasLabel && <label className={labelClass}>{label}</label>}
            <div className={`relative ${!hasLabel && isEntriesPerPage ? "flex h-full min-h-0 flex-col" : ""}`} ref={selectRef}>
                <motion.div
                    ref={triggerRef}
                    className={`${selectStyle} ${controlClassName ?? ''} ${!hasLabel && isEntriesPerPage ? "min-h-0 flex-1" : ""}`.trim()}
                    onClick={selectOptionHandler}
                    initial={false}
                    animate={{ borderRadius }}
                    transition={{ borderRadius: { duration: 0.1, ease: "easeInOut" } }}
                >
                    <span className={valueSpanClass} id="select-value" ref={valueSelectedRef} data-key={defaultSelectedOption?.key || ''} data-cellid={cellId}>{defaultSelectedOption?.value || ''}</span>
                    {isLogin ? (
                        <SelectPointerLogin active={isOptionListVisible} />
                    ) : (
                        <Arrow
                            active={isOptionListVisible}
                            defaultRotation="-rotate-90"
                            activeRotation="rotate-90"
                            height={isTableCell ? 8 : 9}
                            width={isTableCell ? 8 : 9}
                            color={arrowColor}
                        />
                    )}
                </motion.div>
                <div
                    className="invisible h-0 pointer-events-none select-none text-xs"
                    aria-hidden="true"
                >
                    {longestOption.value}XXXXXXX
                </div>
                {!useFixedEntriesList ? (
                    <motion.div
                        className={`absolute w-full overflow-hidden ${isAbm || isTableCell ? "z-[10001]" : isEntriesPerPage ? "z-[80]" : "z-10"}`}
                        initial={false}
                        animate={{ height: isOptionListVisible ? "auto" : 0 }}
                        transition={{ duration: 0.1, ease: "easeInOut" }}
                    >
                        <ul className={optionListStyle} ref={optionListRef}>
                            {options.map((option) => (
                                <li
                                    key={option.key}
                                    className={optionStyle}
                                    onClick={(e) => {
                                        chooseOptionHandler(e, valueSelectedRef);
                                        setIsOptionListVisible(false);
                                    }}
                                    data-key={option.key}
                                >
                                    {option.value}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ) : null}
            </div>
            {useFixedEntriesList &&
                isOptionListVisible &&
                fixedDropdownRect &&
                typeof document !== "undefined" &&
                createPortal(
                    <ul
                        ref={portalListRef}
                        className={`${entriesPortalListClass} fixed max-h-60 overflow-y-auto shadow-lg`}
                        style={{
                            top: fixedDropdownRect.top,
                            left: fixedDropdownRect.left,
                            width: fixedDropdownRect.width,
                            zIndex: 10000,
                        }}
                    >
                        {options.map((option) => (
                            <li
                                key={option.key}
                                className={optionStyle}
                                onClick={(e) => {
                                    chooseOptionHandler(e, valueSelectedRef);
                                    setIsOptionListVisible(false);
                                }}
                                data-key={option.key}
                            >
                                {option.value}
                            </li>
                        ))}
                    </ul>,
                    document.body
                )}
        </div>
    );
}