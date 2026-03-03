'use client';
import React, { useEffect } from "react";
import NavItems from "./NavItems";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Submenu, Menu } from "@/store/navSlice";
import { OpenPage, openPagesActions } from "@/store/openPagesSlice";
import { getPage } from "@/store/openPagesActions";
import { usePathname } from "next/navigation";

export default function MainNavigation({children} : {children : React.ReactNode}) : React.ReactElement {
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);
    const openPages : OpenPage[] = useSelector((state : RootState) => state.openPages || []);
    const pathName = usePathname();
    const dispatch = useDispatch();

    useEffect(() => {
        const pageInMenu : Submenu | undefined = clientMenu.menu.flatMap(m => m.submenu).find(submenu => submenu.path === pathName);

        if(pageInMenu){
            const pageAlreadyOpen : OpenPage | undefined = openPages.find(page => page.page === pageInMenu!.table);

            if(!pageAlreadyOpen){
                dispatch(openPagesActions.addOpenPage({
                    page: pageInMenu.table,
                }));
            } else {
                if(pageAlreadyOpen.active === false){
                    dispatch(openPagesActions.setActivePage({
                        page: pageAlreadyOpen.page
                    }));
                }
            }
        }
    }, [pathName, clientMenu, openPages]);

    return (
        <main className="bg-gabu-300 w-full h-[94vh] p-7">
            {clientMenu.menu && <NavItems/>}
            <div className="h-[92%] bg-gabu-100 w-full relative rounded-b-xl overflow-hidden">
                {openPages.map((page : OpenPage) => {
                    const PageComponent : React.ComponentType = getPage(page.page);

                    return (
                        <div key={page.page} className={`${page.active ? '' : 'hidden'} w-full h-full`}>
                            <PageComponent/>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}