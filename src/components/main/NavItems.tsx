'use client';

import { Reorder } from "motion/react";
import React, { useEffect, useMemo, useState } from "react";
import PinIcon from "../svg/PinIcon";
import Cross from "../svg/Cross";
import { Submenu, Menu, MenuObj } from "@/store/navSlice";
import { navActions } from "@/store/navSlice";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { useRouter, usePathname } from "next/navigation";

export default function NavItems() : React.ReactElement {
    const router = useRouter();
    const pathName = usePathname();
    const dispatch = useDispatch();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);
    const submenus : Submenu[] = useMemo(() => {
        return clientMenu.menu.flatMap(m => m.submenu).filter(submenu => submenu.isOpen).sort((subItemA, subitemB) => subItemA.order - subitemB.order)
    }, [clientMenu])
    const [pages, setPages] = useState<Submenu[]>(submenus);

    const actualActiveChanged : string | undefined = submenus.find(submenu => submenu.active === true)?.path 

    useEffect(() => {
        if(actualActiveChanged && actualActiveChanged !== pathName){
            router.push(actualActiveChanged);
        }
    }, [actualActiveChanged, pathName, router]);
    
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

    function handleClose(page: Submenu) {
        const submenu = pages.find(subItem => subItem.path === page.path)
        if(submenu){
            const isOnlyTab = pages.length === 1;
            if(!isOnlyTab){
                const menuId = clientMenu.menu.findIndex(menu => menu.submenu.some(subItem => subItem.path === page.path));
                const submenuId = menuId >= 0 ? clientMenu.menu[menuId].submenu.findIndex(subItem => subItem.path === page.path) : -1;
                if(menuId >= 0 && submenuId >= 0){
                    dispatch(navActions.closePage({
                        client,
                        submenuId,
                        menuId
                    }));
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

        const submenuId = clientMenu.menu[menuId].submenu.findIndex(subItem => subItem.path === page.path);

        const newSubmenus : Submenu[] = pages.map(subItem => {
            if(subItem.path === page.path){
                return { ...subItem, active: true}
            } else {
                return { ...subItem, active: false}
            }
        });

        dispatch(navActions.activePage({
            client,
            submenuId,
            menuId
        }))
        setPages(newSubmenus);
    }

    return (
        <div className="w-full h-[8%] overflow-auto nav-items">
            <Reorder.Group axis="x" layoutScroll values={pages} onReorder={handleReorder} className="nav-items h-full bg-gabu-300/75 rounded-t-2xl flex">
                {pages.map((page) => (
                    <Reorder.Item key={page.submenuTitle} value={page} className={`gap-1 ${page.active ? 'bg-gabu-100 border-t-2 border-gabu-900 h-full min-w-[20%] flex justify-between items-center cursor-pointer' : 'bg-gabu-300/75 h-full min-w-[20%] flex justify-between items-center cursor-pointer group hover:bg-gabu-100/90'} rounded-t-lg`} onClick={() => handleClickItem(page)}>
                        <p className="font-semibold text-xs xl:text-sm 2xl:text-base text-gabu-700 ml-3 text-nowrap">{page.submenuTitle}</p>
                        <div className={`${page.active ? 'flex mr-3 gap-1' : 'mr-3 gap-1 hidden group-hover:flex'}`} onClick={(e : React.MouseEvent<HTMLOrSVGElement>) => e.stopPropagation()}>
                            <PinIcon style={`h-[15px] w-[15px] 2xl:h-[20px] 2xl:w-[20px] ${page.active ? 'hover:bg-gabu-300 hover:border border-gabu-300' : 'hover:bg-gabu-300 hover:border border-gabu-300 rotate-90'}`} onClick={() => handlePin(page)}/>
                            <Cross style="h-[15px] w-[15px] 2xl:h-[20px] 2xl:w-[20px] hover:bg-gabu-300 hover:border border-gabu-300 fill-current text-gabu-900" onClick={() => handleClose(page)}/>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
}