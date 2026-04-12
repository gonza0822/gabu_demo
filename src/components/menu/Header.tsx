"use client";

import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/store";
import { Menu, navActions } from "@/store/navSlice";
import { overlayActions } from "@/store/overlaySlice";
import Search from "../svg/Search";
import ReziseIcon from "../svg/menu/ReziseIcon";
import DesignIcon from "../svg/menu/DesignIcon";
import Config from "../svg/Config";

type HeaderSearchOption = {
    menuId: number;
    submenuId: number;
    menuTitle: string;
    submenuTitle: string;
    path: string;
    table: string;
    modalOnly?: boolean;
};

export default function Header() : ReactElement {
    const dispatch = useDispatch();
    const router = useRouter();
    const client = useSelector((state: RootState) => state.authorization.client);
    const isSupervisor = useSelector((state: RootState) => state.authorization.supervisor);
    const clientMenu = useSelector((state: RootState) => state.nav.find((m: Menu) => m.client === client));
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const searchOptions = useMemo<HeaderSearchOption[]>(() => {
        if (!clientMenu) return [];
        const options: HeaderSearchOption[] = [];
        clientMenu.menu.forEach((menu, menuId) => {
            menu.submenu.forEach((submenu, submenuId) => {
                if (submenu.table === "UsersTable" && !isSupervisor) return;
                const isFixedAssetsAdd = submenu.path === "/fixedAssets/add";
                if (submenu.hiddenFromSidebar && !isFixedAssetsAdd) return;
                options.push({
                    menuId,
                    submenuId,
                    menuTitle: menu.menuTitle,
                    submenuTitle: submenu.submenuTitle,
                    path: submenu.path,
                    table: submenu.table,
                    modalOnly: submenu.modalOnly,
                });
            });
        });
        return options;
    }, [clientMenu, isSupervisor]);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return searchOptions.slice(0, 10);
        return searchOptions
            .filter((item) => {
                const haystack = `${item.menuTitle} ${item.submenuTitle} ${item.path} ${item.table}`.toLowerCase();
                return haystack.includes(term);
            })
            .slice(0, 12);
    }, [query, searchOptions]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query, isOpen]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSelect(option: HeaderSearchOption) {
        setQuery("");
        setIsOpen(false);
        if (option.modalOnly) {
            if (option.table === "RestartSimulationPage") {
                dispatch(overlayActions.openRestartSimulation());
            }
            return;
        }
        dispatch(
            navActions.openPage({
                client,
                menuId: option.menuId,
                submenuId: option.submenuId,
            })
        );
        router.push(option.path);
    }

    return (
        <header className="w-full bg-gabu-500 flex justify-end items-center flex-grow-0 h-[6vh]">
            <div ref={wrapperRef} className="relative flex items-center bg-gabu-100 rounded-4xl p-1 2xl:p-2 h-[70%] 2xl:h-[60%] w-[40%] mr-[20%]">
                <Search style="mr-2 ml-1 cursor-pointer 2xl:h-[17px] 2xl:w-[17px] h-[14px] w-[14px] stroke-gabu-500"/>
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.currentTarget.value);
                        setIsOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (!isOpen || filteredOptions.length === 0) return;
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
                        } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                        } else if (e.key === "Enter") {
                            e.preventDefault();
                            const selected = filteredOptions[Math.min(activeIndex, filteredOptions.length - 1)];
                            if (selected) handleSelect(selected);
                        } else if (e.key === "Escape") {
                            setIsOpen(false);
                        }
                    }}
                    className="focus:outline-none text-gabu-900 w-full bg-transparent"
                />
                {isOpen && (
                    <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 z-50 bg-gabu-100 border border-gabu-900 rounded-md shadow-lg max-h-64 overflow-auto">
                        {filteredOptions.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gabu-700">Sin resultados</p>
                        ) : (
                            <ul>
                                {filteredOptions.map((option, idx) => (
                                    <li
                                        key={`${option.menuId}-${option.submenuId}-${option.path}`}
                                        className={`px-3 py-2 cursor-pointer border-b border-gabu-300/40 last:border-b-0 ${
                                            idx === activeIndex ? "bg-gabu-300/50" : "hover:bg-gabu-300/40"
                                        }`}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(option)}
                                    >
                                        <p className="text-xs text-gabu-900 font-medium truncate">
                                            {option.menuTitle} / {option.submenuTitle}
                                        </p>
                                        <p className="text-[11px] text-gabu-700 truncate">{option.path}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
            <div className="flex h-full">
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <ReziseIcon/>
                </div>
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <DesignIcon/>
                </div>
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <Config style="fill-current text-gabu-100 2xl:h-[25px] 2xl:w-[25px] h-[22px] w-[22px]"/>
                </div>
            </div>
        </header>
    );
}