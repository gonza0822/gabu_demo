'use client';

import { Reorder } from "motion/react";
import React, { useState } from "react";
import PinIcon from "../svg/PinIcon";
import Cross from "../svg/Cross";
import { Submenu, Menu } from "@/store/navSlice";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { useRouter } from "next/navigation";

type Pages = {
    name: string;
    path: string;
    active: boolean;
}

export default function NavItems() : React.ReactElement {
    const router = useRouter();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    if(client === ''){
        router.push('/');
    }
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);
    let submenus : Submenu[] = clientMenu.menu.flatMap(m => m.submenu)
    submenus = submenus.filter(submenu => submenu.isOpen)

    const [pages, setPages] = useState<Submenu[]>(submenus);

    function handleClose(page: Submenu) {
        /* setPages(prevPages => {
            let newPages : string[];
            if(prevPages.length > 1){
                newPages = prevPages.filter(prevPage => prevPage !== page);
            } else {
                return prevPages;
            }

            return newPages;
        }); */
    }

    return (
        <Reorder.Group axis="x" layoutScroll values={pages} onReorder={setPages} className="h-[8%] bg-gabu-300/75 rounded-t-2xl flex overflow-hidden">
            {pages.map((page) => (
                <Reorder.Item key={page.submenuTitle} value={page} className={`${page.active ? 'bg-gabu-100 border-t-2 border-gabu-900 h-full w-[20%] flex justify-between items-center cursor-pointer' : 'bg-gabu-300/75 h-full w-[20%] flex justify-between items-center cursor-pointer group hover:bg-gabu-100/90'}`}>
                    <p className="font-semibold text-gabu-700 ml-3">{page.submenuTitle}</p>
                    <div className={`${page.active ? 'flex mr-3 gap-1' : 'mr-3 gap-1 hidden group-hover:flex'}`}>
                        <PinIcon style={`${page.active ? 'h-[20px] w-[20px] hover:bg-gabu-300 hover:border border-gabu-300' : 'h-[20px] w-[20px] hover:bg-gabu-300 hover:border border-gabu-300 rotate-90'}`}/>
                        <Cross style="h-[20px] w-[20px] hover:bg-gabu-300 hover:border border-gabu-300 fill-current text-gabu-900" onClick={() => handleClose(page)}/>
                    </div>
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
}