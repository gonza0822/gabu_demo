'use client';

import { Reorder } from "motion/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PinIcon from "../svg/PinIcon";
import Cross from "../svg/Cross";
import { Submenu, Menu, MenuObj } from "@/store/navSlice";
import { navActions } from "@/store/navSlice";
import { openPagesActions } from "@/store/openPagesSlice";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

export default function NavItems() : React.ReactElement {
    const pathName = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);
    const submenus : Submenu[] = useMemo(() => {
        return clientMenu.menu.flatMap(m => m.submenu).filter(submenu => submenu.isOpen).sort((subItemA, subitemB) => subItemA.order - subitemB.order)
    }, [clientMenu])

    /** path → menú padre (p. ej. Administrar en Activo fijo vs Simulaciones); solo para tooltip, no cambia submenuTitle. */
    const menuTitleByPath = useMemo(() => {
        const map = new Map<string, string>();
        for (const mo of clientMenu.menu) {
            for (const sm of mo.submenu) {
                map.set(sm.path, mo.menuTitle);
            }
        }
        return map;
    }, [clientMenu]);

    const [pages, setPages] = useState<Submenu[]>(submenus);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const previousOpenTabsCountRef = useRef<number>(submenus.length);

    const actualActiveChanged : string | undefined = submenus.find(submenu => submenu.active === true)?.path

    // Sync URL when active tab changes (e.g. browser back/forward or initial hydration)
    useEffect(() => {
        if(actualActiveChanged && actualActiveChanged !== pathName){
            window.history.replaceState(null, '', actualActiveChanged);
        }
    }, [actualActiveChanged, pathName]);
    
    async function saveFile() {
        const res = await fetch('/api/menu',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clientMenu),
        })

        const data = await res.json();

        if(!res.ok){
            console.log(res, data)
        }
    }

    useEffect(() => {
        setPages(submenus)

        saveFile();
    }, [submenus.length, actualActiveChanged, clientMenu]);

    useEffect(() => {
        const prevCount = previousOpenTabsCountRef.current;
        if (submenus.length > prevCount) {
            tabsScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
        }
        previousOpenTabsCountRef.current = submenus.length;
    }, [submenus.length]);

    function handleClose(page: Submenu) {
        const submenu = pages.find(subItem => subItem.path === page.path)
        if(submenu){
            const isOnlyTab = pages.length === 1;
            const wasActive = submenu.active;
            const remainingTabs = pages.filter(p => p.path !== submenu.path);
            const fallbackTab = wasActive
                ? remainingTabs.find(p => p.order === submenu.order - 1)
                    ?? remainingTabs.find(p => p.order === submenu.order + 1)
                    ?? remainingTabs.sort((a, b) => a.order - b.order)[0]
                : undefined;
            const menuId = clientMenu.menu.findIndex(menu => menu.submenu.some(subItem => subItem.path === page.path));
            const submenuId = menuId >= 0 ? clientMenu.menu[menuId].submenu.findIndex(subItem => subItem.path === page.path) : -1;
            if(menuId >= 0 && submenuId >= 0){
                dispatch(navActions.closePage({ client, submenuId, menuId }));
                dispatch(openPagesActions.removeOpenPage({ page: page.table }));

                if(isOnlyTab){
                    router.push('/home');
                    return;
                }

                if(fallbackTab){
                    dispatch(openPagesActions.setActivePage({ page: fallbackTab.table }));
                    window.history.replaceState(null, '', fallbackTab.path);
                }
            }
        }
    }

    function handleReorder(newOrder: Submenu[]) {
        setPages(newOrder);

        dispatch(navActions.changeOrder({
            client,
            newSubmenus : newOrder
        }));

    }

    function handlePin(page: Submenu) {
        let newOrder : Submenu[] = pages.map(subItem => {
            if(subItem.path === page.path){
                return { ...subItem, order: 1}
            } else {
                if(subItem.order < page.order){
                    return { ...subItem, order: subItem.order + 1}
                } else {
                    return { ...subItem }
                }
            }
        })

        newOrder = newOrder.sort((subItemA, subitemB) => subItemA.order - subitemB.order);

        setPages(newOrder);

        dispatch(navActions.changeOrder({
            client,
            newSubmenus: newOrder
        }))
    }

    function handleClickItem(page: Submenu) {
        const menuId = clientMenu.menu.findIndex(menu => menu.submenu.some(subItem => subItem.path === page.path));
        const submenuId = menuId >= 0 ? clientMenu.menu[menuId].submenu.findIndex(subItem => subItem.path === page.path) : -1;
        const newSubmenus : Submenu[] = pages.map(subItem => {
            if(subItem.path === page.path){
                return { ...subItem, active: true}
            } else {
                return { ...subItem, active: false}
            }
        });

        dispatch(navActions.activePage({ client, submenuId, menuId }));
        dispatch(openPagesActions.setActivePage({ page: page.table }));
        setPages(newSubmenus);
        window.history.pushState(null, '', page.path);
    }

    return (
        <div ref={tabsScrollRef} className="w-full h-[8%] overflow-auto nav-items">
            <Reorder.Group axis="x" layoutScroll values={pages} onReorder={handleReorder} className="nav-items h-full bg-gabu-300/75 rounded-t-2xl flex">
                {pages.map((page) => {
                    const parentMenu = menuTitleByPath.get(page.path);
                    const isSimulationTab = parentMenu === 'Simulaciones';
                    const tabLabel = isSimulationTab ? `${page.submenuTitle} (Simulación)` : page.submenuTitle;
                    const tabTooltip = parentMenu ? `${tabLabel} — ${parentMenu}` : tabLabel;
                    return (
                    <Reorder.Item key={page.path} value={page} className={`gap-1 shrink-0 min-w-[20%] ${page.active ? 'bg-gabu-100 border-t-2 border-gabu-900 h-full flex justify-between items-center cursor-pointer' : 'bg-gabu-300/75 h-full flex justify-between items-center cursor-pointer group hover:bg-gabu-100/90'} rounded-t-lg`} onClick={() => handleClickItem(page)}>
                        <p className="font-semibold text-xs xl:text-sm 2xl:text-base text-gabu-700 ml-3 truncate min-w-0 flex-1" title={tabTooltip}>{tabLabel}</p>
                        <div className={`flex mr-3 gap-1 shrink-0 w-[52px] justify-end ${!page.active ? 'invisible group-hover:visible' : ''}`} onClick={(e : React.MouseEvent<HTMLOrSVGElement>) => e.stopPropagation()}>
                            <PinIcon style={`h-[15px] w-[15px] 2xl:h-[20px] 2xl:w-[20px] ${page.active ? 'hover:bg-gabu-300 hover:border border-gabu-300' : 'hover:bg-gabu-300 hover:border border-gabu-300 rotate-90'}`} onClick={() => handlePin(page)}/>
                            <Cross style="h-[15px] w-[15px] 2xl:h-[20px] 2xl:w-[20px] hover:bg-gabu-300 hover:border border-gabu-300 fill-current text-gabu-900" onClick={() => handleClose(page)}/>
                        </div>
                    </Reorder.Item>
                    );
                })}
            </Reorder.Group>
        </div>
    );
}